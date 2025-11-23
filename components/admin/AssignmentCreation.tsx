import React, { useEffect, useMemo, useState } from 'react';
import {
    FileText,
    Upload,
    Plus,
    RefreshCw,
    Calendar as CalendarIcon,
    Clock,
    Paperclip,
    Link as LinkIcon,
    Loader2,
    X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { useToast } from '../../src/context/ToastContext';
import { useAuth } from '../../src/context/AuthContext';
import { assignmentService, SessionOption } from '../../src/services/assignment-service';
import { AssignmentWithSession } from '../../types';

interface AssignmentFormState {
    title: string;
    description: string;
    sessionId: string;
    dueDate: string;
    resourceUrl: string;
}

const DEFAULT_FORM: AssignmentFormState = {
    title: '',
    description: '',
    sessionId: '',
    dueDate: '',
    resourceUrl: ''
};

const formatDate = (value?: string | null) => {
    if (!value) return 'No deadline';
    const date = new Date(value);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const daysUntil = (value?: string | null) => {
    if (!value) return null;
    const due = new Date(value).getTime();
    const now = Date.now();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
};

export const AssignmentCreation: React.FC = () => {
    const toast = useToast();
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<AssignmentWithSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchingSessions, setFetchingSessions] = useState(false);
    const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([]);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<AssignmentFormState>(DEFAULT_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [resourceUploading, setResourceUploading] = useState(false);

    const loadAssignments = async () => {
        try {
            setLoading(true);
            const items = await assignmentService.listForAdmin({ limit: 60 });
            setAssignments(items);
        } catch (err: any) {
            toast.showError('Failed to load assignments', err.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
    };

    const loadSessions = async () => {
        try {
            setFetchingSessions(true);
            const result = await assignmentService.fetchSessionOptions();
            setSessionOptions(result);
        } catch (err: any) {
            toast.showError('Failed to load sessions', err.message || 'Unexpected error');
        } finally {
            setFetchingSessions(false);
        }
    };

    useEffect(() => {
        loadAssignments();
        loadSessions();
    }, []);

    const stats = useMemo(() => {
        const total = assignments.length;
        const dueSoon = assignments.filter((assignment) => {
            const diff = daysUntil(assignment.due_date);
            return typeof diff === 'number' && diff >= 0 && diff <= 7;
        }).length;

        const publishedThisWeek = assignments.filter((assignment) => {
            const created = new Date(assignment.created_at).getTime();
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            return created >= weekAgo;
        }).length;

        return {
            total,
            dueSoon,
            publishedThisWeek
        };
    }, [assignments]);

    const filteredAssignments = useMemo(() => {
        if (!search.trim()) return assignments;
        const term = search.toLowerCase();
        return assignments.filter((assignment) => {
            return (
                assignment.title.toLowerCase().includes(term) ||
                (assignment.description || '').toLowerCase().includes(term) ||
                (assignment.session?.title || '').toLowerCase().includes(term)
            );
        });
    }, [assignments, search]);

    const isFormValid = form.title.trim().length > 2;

    const handleResourceUploadSuccess = (fileUrl: string) => {
        setForm((prev) => ({ ...prev, resourceUrl: fileUrl }));
        setResourceUploading(false);
        toast.showSuccess('Resource uploaded');
    };

    const handleResourceUploadError = (error: string) => {
        setResourceUploading(false);
        toast.showError('Upload failed', error);
    };

    const handleResourceUploadProgress = (progress: number) => {
        if (progress > 0 && progress < 100) {
            setResourceUploading(true);
        }
        if (progress === 100) {
            setResourceUploading(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!user) {
            toast.showError('Missing admin context', 'Sign in again to publish assignments.');
            return;
        }

        try {
            setSubmitting(true);
            const created = await assignmentService.create({
                admin_id: user.id,
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                session_id: form.sessionId || null,
                due_date: form.dueDate || null,
                file_url: form.resourceUrl || undefined
            });

            setAssignments((prev) => [created, ...prev]);
            toast.showSuccess('Assignment created');
            setForm(DEFAULT_FORM);
            setShowForm(false);
        } catch (err: any) {
            toast.showError('Unable to create assignment', err.message || 'Unexpected error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Assignments</h1>
                    <p className="text-sm text-gray-500">Publish coursework and track student submissions.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={loadAssignments}
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </Button>
                    <Button className="gap-2" onClick={() => setShowForm(true)}>
                        <Plus size={16} /> New Assignment
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-500">Published</p>
                    <p className="text-2xl font-bold text-dark">{stats.total}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-500">Due this week</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.dueSoon}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <p className="text-xs text-gray-500">New this week</p>
                    <p className="text-2xl font-bold text-secondary">{stats.publishedThisWeek}</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
                    <div className="flex-1">
                        <input
                            type="search"
                            placeholder="Search by title, description, or session"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredAssignments.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-2xl p-12 text-center">
                        <FileText size={40} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">No assignments match this filter.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredAssignments.map((assignment) => {
                            const diff = daysUntil(assignment.due_date);
                            const dueLabel = typeof diff === 'number'
                                ? diff < 0
                                    ? 'Past due'
                                    : diff === 0
                                        ? 'Due today'
                                        : `${diff} day${diff === 1 ? '' : 's'}`
                                : 'Flexible';

                            return (
                                <div key={assignment.id} className="border border-gray-200 rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                                            <CalendarIcon size={14} />
                                            <span>{formatDate(assignment.due_date)}</span>
                                        </div>
                                        <h3 className="font-bold text-lg text-dark mb-1">{assignment.title}</h3>
                                        <p className="text-sm text-gray-600 line-clamp-2">{assignment.description || 'No description provided.'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        {assignment.session?.title && (
                                            <span className="px-2 py-1 bg-gray-100 rounded-full">{assignment.session.title}</span>
                                        )}
                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full flex items-center gap-2">
                                            <Clock size={12} /> {dueLabel}
                                        </span>
                                        <span className="px-2 py-1 bg-gray-100 rounded-full">
                                            {assignment.submission_count || 0} submissions
                                        </span>
                                    </div>
                                    {assignment.file_url && (
                                        <button
                                            onClick={() => window.open(assignment.file_url!, '_blank')}
                                            className="flex items-center gap-2 text-sm text-primary font-medium"
                                        >
                                            <Paperclip size={14} /> View resource
                                        </button>
                                    )}
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
                                <h2 className="text-xl font-bold text-dark">Publish assignment</h2>
                                <p className="text-sm text-gray-500">This will be visible to all enrolled students immediately.</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
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
                                    placeholder="e.g., Build a landing page"
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
                                    placeholder="Share context, tools, or grading criteria"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Attach to session</label>
                                    <select
                                        value={form.sessionId}
                                        onChange={(event) => setForm((prev) => ({ ...prev, sessionId: event.target.value }))}
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        disabled={fetchingSessions}
                                    >
                                        <option value="">Optional</option>
                                        {sessionOptions.map((session) => (
                                            <option key={session.id} value={session.id}>
                                                {session.title} • {formatDate(session.session_date)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-500">Due date</label>
                                    <input
                                        type="datetime-local"
                                        value={form.dueDate}
                                        onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                                        className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-gray-500 mb-2 block">Reference material</label>
                                {form.resourceUrl ? (
                                    <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm">
                                            <LinkIcon size={16} className="text-primary" />
                                            <span className="text-gray-700 truncate max-w-xs">
                                                {form.resourceUrl}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setForm((prev) => ({ ...prev, resourceUrl: '' }))}
                                            className="text-xs text-red-500"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <FileUpload
                                        options={{
                                            bucket: 'assignments',
                                            allowedTypes: ['.pdf', '.doc', '.docx', '.zip', '.jpg', '.jpeg', '.png'],
                                            maxSize: 10 * 1024 * 1024,
                                            onSuccess: handleResourceUploadSuccess,
                                            onError: handleResourceUploadError,
                                            onProgress: handleResourceUploadProgress
                                        }}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <Upload size={24} className="text-gray-400" />
                                            <p className="text-sm text-gray-600">Drop files or click to upload</p>
                                            <p className="text-xs text-gray-400">PDF, DOCX, ZIP · 10 MB max</p>
                                        </div>
                                    </FileUpload>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowForm(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={!isFormValid || submitting || resourceUploading} className="gap-2">
                                    {submitting && <Loader2 size={16} className="animate-spin" />}
                                    Publish assignment
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
