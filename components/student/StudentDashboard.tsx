import React from 'react';
import { Calendar, Video, BookOpen, Clock, PlayCircle, ArrowRight, AlertCircle, RefreshCw, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { StudentView } from '../../types';
import { DashboardSkeleton } from '@/src/components/ui/LoadingSkeleton';
import { StudentDataState } from '@/src/hooks/useStudentData';
import { StudentPaymentStats } from '@/src/hooks/useStudentPayments';

interface StudentDashboardProps {
    onChangeView: (view: StudentView) => void;
    data: Pick<StudentDataState, 'profile' | 'upcomingSession' | 'pendingAssignments' | 'recentRecordings' | 'loading' | 'error' | 'retryFetch' | 'hasError' | 'canRetry'> & {
        paymentStats: StudentPaymentStats;
        paymentsLoading: boolean;
    };
    fallbackEmail?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onChangeView, data, fallbackEmail }) => {
    const { profile, upcomingSession, pendingAssignments, recentRecordings, loading, error, retryFetch, hasError, canRetry, paymentStats, paymentsLoading } = data;
    const displayName = profile?.name || fallbackEmail?.split('@')[0] || 'Student';

    const formatCurrency = (value: number = 0) =>
        value.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        });

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (hasError) {
        return (
            <div className="p-8">
                <div className="max-w-md mx-auto text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>

                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Dashboard Loading Failed
                    </h2>

                    <p className="text-gray-600 mb-6">
                        {error || 'Unable to load your dashboard. Please check your connection and try again.'}
                    </p>

                    <div className="flex gap-3 justify-center">
                        {canRetry && (
                            <Button
                                onClick={retryFetch}
                                className="flex items-center gap-2"
                                variant="outline"
                            >
                                <RefreshCw size={16} />
                                Retry
                            </Button>
                        )}

                        <Button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2"
                        >
                            Refresh Page
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="space-y-8">
            {/* Welcome & Progress */}
            <div className="flex flex-col md:flex-row gap-6 items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-dark mb-2">
                        Hi {displayName}! 👋 <span className="text-gray-500 font-normal text-lg hidden sm:inline">Ready to build something cool?</span>
                    </h1>
                    <p className="text-gray-500 mb-6">You're making great progress in the "No-Code Entrepreneurship" course.</p>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-bold text-gray-600">
                            <span>Course Progress</span>
                            <span className="text-primary">40%</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary to-secondary w-[40%] rounded-full"></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">4 of 10 modules completed</p>
                        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                            <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                <p className="text-gray-500 mb-1">Paid so far</p>
                                <p className="text-sm font-bold text-dark">{formatCurrency(paymentStats.totalPaid)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                <p className="text-gray-500 mb-1">Pending balance</p>
                                <p className="text-sm font-bold text-dark">{formatCurrency(paymentStats.pendingAmount)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-auto flex justify-center">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="351.86" strokeDashoffset="211" className="text-accent" strokeLinecap="round" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-2xl font-bold text-dark">40%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Up Next Card */}
                <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-sm">UP NEXT</span>
                            <span className="text-xs font-medium opacity-80 flex items-center gap-1"><Clock size={12} /> {upcomingSession ? new Date(upcomingSession.session_date).toLocaleDateString() : 'No upcoming sessions'}</span>
                        </div>

                        <h3 className="font-display font-bold text-xl mb-1">{upcomingSession ? upcomingSession.title : 'Relax!'}</h3>
                        <p className="text-blue-100 text-sm mb-6">{upcomingSession ? upcomingSession.description : 'No classes scheduled soon.'}</p>

                        {upcomingSession && (
                            <Button variant="accent" size="sm" fullWidth className="font-bold text-dark shadow-none hover:bg-white" onClick={() => window.open(upcomingSession.meeting_link, '_blank')}>
                                Join Class Link
                            </Button>
                        )}
                    </div>
                </div>

                {/* Recent Assignment */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
                            <BookOpen size={20} />
                        </div>
                        <h3 className="font-bold text-dark">Pending Homework</h3>
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4">
                        {pendingAssignments.length > 0 ? (
                            <>
                                <h4 className="font-bold text-sm text-dark mb-1">{pendingAssignments[0].title}</h4>
                                <p className="text-xs text-gray-500 mb-2">{pendingAssignments[0].description}</p>
                                <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-1 rounded">
                                    {pendingAssignments.length} pending {pendingAssignments.length === 1 ? 'assignment' : 'assignments'}
                                </span>
                            </>
                        ) : (
                            <>
                                <h4 className="font-bold text-sm text-dark mb-1">No pending assignments</h4>
                                <p className="text-xs text-gray-500 mb-2">Great job! You're all caught up.</p>
                                <span className="text-xs font-semibold text-green-500 bg-green-50 px-2 py-1 rounded">All caught up!</span>
                            </>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        className="mt-auto"
                        onClick={() => onChangeView('assignments')}
                    >
                        Submit Assignment
                    </Button>
                </div>

                {/* Quick Recordings */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                            <Video size={20} />
                        </div>
                        <h3 className="font-bold text-dark">Watch Recordings</h3>
                    </div>

                    <div className="space-y-3 mb-4">
                        {recentRecordings.length > 0 ? (
                            recentRecordings.map((recording) => (
                                <button
                                    key={recording.id}
                                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group text-left"
                                    onClick={() => window.open(recording.video_url, '_blank')}
                                >
                                    <div className="w-10 h-8 bg-gray-200 rounded-md relative overflow-hidden shrink-0">
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <PlayCircle size={16} className="text-white opacity-80 group-hover:scale-110 transition-transform" />
                                        </div>
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-semibold text-sm text-dark truncate">{recording.title}</p>
                                        <p className="text-xs text-gray-500">
                                            {recording.session_date ? new Date(recording.session_date).toLocaleDateString() : 'Recent'} •
                                            {' '}{new Date(recording.uploaded_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-xs text-gray-500">No recordings available yet</p>
                            </div>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        className="mt-auto gap-2 group"
                        onClick={() => onChangeView('recordings')}
                    >
                        View All Library <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>

                {/* Billing Summary */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                            <CreditCard size={20} />
                        </div>
                        <h3 className="font-bold text-dark">Billing Summary</h3>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Total Paid</span>
                            <strong className="text-dark">{paymentsLoading ? '—' : formatCurrency(paymentStats.totalPaid)}</strong>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Outstanding</span>
                            <strong className="text-amber-600">{paymentsLoading ? '—' : formatCurrency(paymentStats.pendingAmount)}</strong>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Next invoice</span>
                            <span>{paymentStats.nextDuePayment ? new Date(paymentStats.nextDuePayment.created_at).toLocaleDateString() : 'None'}</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        className="mt-auto gap-2"
                        onClick={() => onChangeView('payments')}
                    >
                        <CheckCircle size={14} /> Review Payments
                    </Button>
                </div>

            </div>
        </div>
    );
};