import React from 'react';
import { CreditCard, Download, CheckCircle, Clock, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Payment } from '../../types';
import { useToast } from '../../src/context/ToastContext';
import { StudentPaymentsState } from '../../src/hooks/useStudentPayments';
import { useOptionalStudentPaymentsContext } from '../../src/context/StudentPaymentsContext';

const statusStyles: Record<Payment['status'], string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700'
};

const formatCurrency = (value: number = 0) =>
    value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    });

const formatDate = (input?: string | null) =>
    input ? new Date(input).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

interface StudentPaymentsProps {
    state?: StudentPaymentsState;
}

export const StudentPayments: React.FC<StudentPaymentsProps> = ({ state }) => {
    const toast = useToast();
    const contextState = useOptionalStudentPaymentsContext();
    const paymentsState = state ?? contextState;

    if (!paymentsState) {
        throw new Error('StudentPayments requires state from props or StudentPaymentsProvider');
    }

    const { payments, stats, loading, hasError, error, retryFetch, canRetry } = paymentsState;

    const handleDownloadReceipt = (payment: Payment) => {
        const receiptUrl = payment.payment_url || payment.webhook_payload?.receipt_url;
        if (receiptUrl) {
            window.open(receiptUrl, '_blank');
        } else {
            toast.showInfo('No receipt available for this payment yet');
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-48 bg-white rounded-3xl border border-gray-100 animate-pulse" />
                <div className="h-80 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="bg-white rounded-3xl border border-red-100 p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 mx-auto flex items-center justify-center">
                    <AlertCircle className="text-red-600" size={28} />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-dark mb-2">Unable to load payments</h2>
                    <p className="text-sm text-gray-500">{error || 'Please check your connection and try again.'}</p>
                </div>
                <div className="flex justify-center gap-3">
                    {canRetry && (
                        <Button variant="outline" className="gap-2" onClick={retryFetch}>
                            <RefreshCw size={16} /> Retry
                        </Button>
                    )}
                    <Button onClick={() => window.location.reload()} className="gap-2">
                        <Loader2 size={16} className="animate-spin" /> Reload
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
                <CreditCard className="text-accent" /> Payments & Invoices
            </h1>

            <div className="bg-gradient-to-r from-dark to-gray-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Total Paid</p>
                        <h2 className="text-4xl font-bold font-display text-white">{formatCurrency(stats.totalPaid)}</h2>
                        <p className="text-sm text-accent mt-2 flex items-center gap-1">
                            {stats.hasPending ? (
                                <>
                                    <Clock size={14} /> {formatCurrency(stats.pendingAmount)} pending
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={14} /> Course fully paid
                                </>
                            )}
                        </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                        <p className="text-xs text-gray-300 mb-1">Next Payment</p>
                        {stats.nextDuePayment ? (
                            <>
                                <p className="text-lg font-bold">{formatCurrency(stats.nextDuePayment.amount || 0)}</p>
                                <p className="text-[10px] text-gray-400">Created {formatDate(stats.nextDuePayment.created_at)}</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold">None</p>
                                <p className="text-[10px] text-gray-400">You're up to date on payments.</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-dark">Transaction History</h3>
                    <Button variant="outline" size="sm" className="gap-2" onClick={retryFetch}>
                        <RefreshCw size={14} /> Refresh
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Reference</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payments.length > 0 ? (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-gray-600">
                                            {payment.payment_id || payment.payment_request_id || payment.id}
                                        </td>
                                        <td className="px-6 py-4">{formatDate(payment.paid_at || payment.created_at)}</td>
                                        <td className="px-6 py-4 font-semibold text-dark">{formatCurrency(payment.amount || 0)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusStyles[payment.status]}`}>
                                                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1 h-8 px-2"
                                                onClick={() => handleDownloadReceipt(payment)}
                                                disabled={payment.status !== 'paid'}
                                            >
                                                <Download size={12} />
                                                Download
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <CreditCard size={36} className="text-gray-300" />
                                            <p>No payments recorded yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};