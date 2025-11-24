import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Check, X, Phone, MessageCircle, AlertCircle, RefreshCw, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { CTASubmission } from '../../types';
import { ctaService, CTAFilters } from '../../src/services/cta-service';
import { useToast } from '@/src/context/ToastContext';

const TIME_SLOT_LABELS: Record<string, string> = {
    'weekday-pm': 'Weekdays (4 PM - 6 PM)',
    'weekend-am': 'Weekends (10 AM - 12 PM)',
    'weekend-pm': 'Weekends (2 PM - 4 PM)'
};

type StatusFilter = 'all' | 'new' | 'approved' | 'rejected';

export const CTAReview: React.FC = () => {
    const toast = useToast();
    const [submissions, setSubmissions] = useState<CTASubmission[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const pageSize = 20;

    const fetchSubmissions = useCallback(async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const filters: CTAFilters = {
                status: statusFilter === 'all' ? undefined : statusFilter,
                searchTerm: searchTerm.trim() || undefined,
                limit: pageSize,
                offset: (currentPage - 1) * pageSize
            };

            const { data, count } = await ctaService.list(filters);

            setSubmissions(data);
            setTotalCount(count);

            if (isManualRefresh) {
                toast.showSuccess('Enquiries refreshed');
            }
        } catch (err: any) {
            console.error('Failed to fetch CTA submissions', err);
            setError(err.message || 'Unable to load enquiries');
            if (isManualRefresh) {
                toast.showError('Unable to refresh enquiries', err.message || 'Please try again.');
            }
        } finally {
            if (isManualRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [toast, statusFilter, searchTerm, currentPage]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    useEffect(() => {
        // Reset to page 1 when filters change
        setCurrentPage(1);
    }, [statusFilter, searchTerm]);

    const totalPages = Math.ceil(totalCount / pageSize);

    const statusBadgeClass = (status: CTASubmission['status']) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-700';
            case 'rejected':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-blue-100 text-blue-700';
        }
    };

    const handleStatusChange = async (id: string, nextStatus: 'approved' | 'rejected') => {
        try {
            setUpdatingId(id);

            if (nextStatus === 'approved') {
                await ctaService.approve(id);
            } else {
                await ctaService.reject(id);
            }

            toast.showSuccess(`Enquiry marked as ${nextStatus}.`);
            fetchSubmissions(true); // Refresh the list
        } catch (err: any) {
            console.error('Failed to update CTA status', err);
            toast.showError('Failed to update enquiry', err.message || 'Please try again.');
        } finally {
            setUpdatingId(null);
        }
    };

    const getSlotLabel = (slot?: string | null) => {
        if (!slot) return 'Not provided';
        return TIME_SLOT_LABELS[slot] || slot;
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const openWhatsapp = (lead: CTASubmission) => {
        if (typeof window === 'undefined') return;
        const digits = lead.phone.replace(/[^+\d]/g, '');
        const message = encodeURIComponent(`Hi ${lead.name}, thanks for your interest!`);
        window.open(`https://wa.me/${digits}?text=${message}`, '_blank', 'noopener,noreferrer');
    };

    const callLead = (lead: CTASubmission) => {
        if (typeof window === 'undefined') return;
        window.open(`tel:${lead.phone}`, '_self');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading enquiries...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-red-100 p-8 text-center text-red-600">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <AlertCircle />
                    <span>Unable to load enquiries</span>
                </div>
                <p className="text-sm text-red-500 mb-6">{error}</p>
                <Button onClick={() => fetchSubmissions(true)} className="gap-2">
                    <RefreshCw size={16} /> Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Enquiry Review</h1>
                    <p className="text-gray-500 text-sm">{totalCount} total leads captured from the landing CTA.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => fetchSubmissions(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'new', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${statusFilter === status ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}
                        >
                            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {submissions.length === 0 && !loading ? (
                    <div className="p-12 text-center text-gray-500 text-sm">
                        No enquiries found for this filter.
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-gray-500 text-sm font-semibold uppercase">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Preferred Slot</th>
                                <th className="px-6 py-4">Submitted</th>
                                <th className="px-6 py-4">Message</th>
                                <th className="px-6 py-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {submissions.map((lead) => (
                                <React.Fragment key={lead.id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-dark">{lead.name}</p>
                                            <p className="text-xs text-gray-500">{lead.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadgeClass(lead.status)}`}>
                                                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{getSlotLabel(lead.preferred_time_slot)}</td>
                                        <td className="px-6 py-4 text-gray-500">{formatTimestamp(lead.submission_date)}</td>
                                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs">{lead.message || '—'}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setExpandedRow(expandedRow === lead.id ? null : lead.id)}
                                                className="text-primary hover:text-blue-700 font-medium text-xs flex items-center gap-1"
                                            >
                                                {expandedRow === lead.id ? 'Hide' : 'Review'}
                                                {expandedRow === lead.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRow === lead.id && (
                                        <tr className="bg-gray-50/50">
                                            <td colSpan={6} className="px-6 py-6">
                                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-inner grid md:grid-cols-2 gap-6">
                                                    <div>
                                                        <h4 className="font-bold text-dark mb-4">Full Details</h4>
                                                        <div className="space-y-3 text-sm">
                                                            <p><span className="text-gray-500 w-28 inline-block">Email:</span> {lead.email}</p>
                                                            <p><span className="text-gray-500 w-28 inline-block">Phone:</span> {lead.phone}</p>
                                                            <p><span className="text-gray-500 w-28 inline-block">Age:</span> {lead.age || 'Not provided'}</p>
                                                            <p><span className="text-gray-500 w-28 inline-block">Time Slot:</span> {getSlotLabel(lead.preferred_time_slot)}</p>
                                                            <p><span className="text-gray-500 w-28 inline-block">Source:</span> {lead.source || 'Landing Form'}</p>
                                                            <div className="mt-4">
                                                                <span className="text-gray-500 block mb-1">Full Message:</span>
                                                                <p className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-gray-700 whitespace-pre-line">{lead.message || '—'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col justify-between">
                                                        <div>
                                                            <h4 className="font-bold text-dark mb-4">Quick Actions</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                                                                    onClick={() => handleStatusChange(lead.id, 'approved')}
                                                                    disabled={updatingId === lead.id}
                                                                >
                                                                    {updatingId === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                                                    onClick={() => handleStatusChange(lead.id, 'rejected')}
                                                                    disabled={updatingId === lead.id}
                                                                >
                                                                    {updatingId === lead.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                className="gap-2 bg-[#25D366] hover:bg-[#128C7E] border-none w-full sm:w-auto"
                                                                onClick={() => openWhatsapp(lead)}
                                                            >
                                                                <MessageCircle size={14} /> WhatsApp
                                                            </Button>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="gap-2 w-full sm:w-auto"
                                                                onClick={() => callLead(lead)}
                                                            >
                                                                <Phone size={14} /> Call
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination Controls */}
                {totalCount > pageSize && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                        <div className="text-sm text-gray-600">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} submissions
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1 || loading}
                                className="gap-1"
                            >
                                <ChevronLeft size={16} />
                                Previous
                            </Button>
                            <div className="flex items-center px-3 text-sm font-medium text-gray-700">
                                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                                disabled={currentPage >= Math.ceil(totalCount / pageSize) || loading}
                                className="gap-1"
                            >
                                Next
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
