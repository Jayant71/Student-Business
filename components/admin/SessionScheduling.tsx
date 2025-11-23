import React, { useEffect, useMemo, useState } from 'react';
import {
    Calendar,
    Clock,
    Video,
    Plus,
    RefreshCw,
    Loader2,
    ExternalLink,
    AlertTriangle,
    X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../src/context/ToastContext';
import { useAuth } from '../../src/context/AuthContext';
import { sessionService } from '../../src/services/session-service';
import { Session } from '../../types';

interface SessionFormState {
    title: string;
    description: string;
    date: string;
    time: string;
    meetingLink: string;
    status: Session['status'];
}

const DEFAULT_FORM: SessionFormState = {
    title: '',
    description: '',
    date: '',
    time: '',
    meetingLink: '',
    status: 'upcoming'
};

const formatDate = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
};

const formatTime = (value: string) => {
    const [hour, minute] = value.split(':');
    const date = new Date();
    date.setHours(Number(hour), Number(minute));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const statusStyles: Record<Session['status'], string> = {
    upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
    ongoing: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    completed: 'bg-green-50 text-green-700 border-green-200'
};

export const SessionScheduling: React.FC = () => {
    const toast = useToast();
    const { user } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<SessionFormState>(DEFAULT_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    const loadSessions = async () => {
        try {
            setLoading(true);
            const today = new Date().toISOString().split('T')[0];
            const result = await sessionService.list({ fromDate: today, limit: 60 });
            setSessions(result);
        } catch (err: any) {
            toast.showError('Failed to load sessions', err.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, []);

    const stats = useMemo(() => {
        const upcoming = sessions.filter((session) => session.status === 'upcoming').length;
        const ongoing = sessions.filter((session) => session.status === 'ongoing').length;
        const completed = sessions.filter((session) => session.status === 'completed').length;
        return { upcoming, ongoing, completed };
    }, [sessions]);

    const filteredSessions = useMemo(() => {
        if (!search.trim()) return sessions;
        const term = search.toLowerCase();
        return sessions.filter((session) =>
            session.title.toLowerCase().includes(term) ||
            (session.description || '').toLowerCase().includes(term)
        );
    }, [sessions, search]);

    const isFormValid =
        form.title.trim().length > 2 &&
        form.date !== '' &&
        form.time !== '';

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) {
            toast.showError('Missing admin context', 'Sign in again to schedule sessions.');
            return;
        }

        try {
            setSubmitting(true);
            const created = await sessionService.create({
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                session_date: form.date,
                start_time: form.time,
                meeting_link: form.meetingLink.trim() || undefined,
                status: form.status,
                created_by: user.id
            });

            setSessions((prev) => [...prev, created].sort((a, b) => a.session_date.localeCompare(b.session_date)));
            toast.showSuccess('Session scheduled');
            setForm(DEFAULT_FORM);
            setShowForm(false);
        } catch (err: any) {
            toast.showError('Unable to schedule session', err.message || 'Unexpected error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (session: Session, status: Session['status']) => {
        if (session.status === status) return;
        try {
            const updated = await sessionService.setStatus(session.id, status);
            setSessions((prev) => prev.map((item) => (item.id === session.id ? updated : item)));
            toast.showSuccess(`Session marked as ${status}`);
        } catch (err: any) {
            toast.showError('Failed to update status', err.message || 'Unexpected error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Class Schedule</h1>
                    <p className="text-sm text-gray-500">View upcoming cohorts and keep meeting links in sync.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2" onClick={loadSessions} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                    <Button className="gap-2" onClick={() => setShowForm(true)}>
                        <Plus size={16} /> Schedule Session
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-500">Upcoming</p>
                    <p className="text-2xl font-bold text-dark">{stats.upcoming}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-500">Live Now</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.ongoing}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="text-2xl font-bold text-success">{stats.completed}</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                    <input
                        type="search"
                        placeholder="Search by topic or description"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-2xl p-12 text-center">
                        <Video size={40} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No sessions match this filter.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredSessions.map((session) => {
                            const sessionDate = new Date(session.session_date);
                            const monthLabel = sessionDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                            const dayNumber = sessionDate.getDate();

                            return (
                                <div
                                    key={session.id}
                                    className="border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 lg:flex-row lg:items-center"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col items-center justify-center">
                                            <span className="text-xs font-bold text-gray-500 uppercase">{monthLabel}</span>
                                            <span className="text-xl font-bold text-dark">{dayNumber}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-lg text-dark">{session.title}</h3>
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${statusStyles[session.status]}`}>
                                                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-2">
                                                {session.description || 'No description provided.'}
                                            </p>
                                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={14} /> {formatDate(session.session_date)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} /> {formatTime(session.start_time)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 lg:text-right">
                                        {session.meeting_link ? (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => window.open(session.meeting_link!, '_blank')}
                                            >
                                                <ExternalLink size={14} /> Join Link
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-gray-400">No meeting link</span>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            {session.status !== 'ongoing' && (
                                                <Button size="sm" variant="outline" onClick={() => handleStatusChange(session, 'ongoing')}>
                                                    Go Live
                                                </Button>
                                            )}
                                            {session.status !== 'completed' && (
                                                <Button size="sm" variant="outline" onClick={() => handleStatusChange(session, 'completed')}>
                                                    Mark Done
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-dark">Schedule session</h2>
                                <p className="text-sm text-gray-500">Invite all enrolled students with the up-to-date meeting link.</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form className="p-6 space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <label className="text-xs font-semibold text-gray-500">Title</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g., Session 7: UX teardown"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    rows={4}
                                    placeholder="What will you cover? Include prep instructions."
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Date</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Start time</label>
                                    <input
                                        type="time"
                                        value={form.time}
                                        onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500">Meeting link</label>
                                <input
                                    type="url"
                                    value={form.meetingLink}
                                    onChange={(event) => setForm((prev) => ({ ...prev, meetingLink: event.target.value }))}
                                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="https://meet.google.com/..."
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as Session['status'] }))}
                                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="upcoming">Upcoming</option>
                                    <option value="ongoing">Ongoing</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                                <AlertTriangle size={16} className="text-amber-500" />
                                <p>Students will see this immediately inside their dashboard schedule module.</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!isFormValid || submitting} className="gap-2">
                                    {submitting && <Loader2 size={16} className="animate-spin" />}
                                    Save session
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
