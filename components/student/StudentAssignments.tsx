import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Upload, CheckCircle, Clock, FileText, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { assignmentService } from '../../src/services/assignment-service';
import { StudentAssignmentView } from '../../types';

const formatDueDate = (dueDate?: string | null) => {
    if (!dueDate) return 'No deadline';
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const isOverdue = (dueDate?: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
};

export const StudentAssignments: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [assignments, setAssignments] = useState<StudentAssignmentView[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingAssignmentId, setUploadingAssignmentId] = useState<string | null>(null);

    const loadAssignments = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const payload = await assignmentService.listForStudent(user.id);
            setAssignments(payload);
        } catch (err: any) {
            toast.showError('Failed to load assignments', err.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssignments();
    }, [user?.id]);

    const pendingCount = useMemo(() => assignments.filter((assignment) => assignment.status === 'pending').length, [assignments]);

    const handleUploadError = (error: string) => {
        toast.showError('Upload failed', error);
        setUploadingAssignmentId(null);
    };

    const handleFileUpload = async (assignmentId: string, fileUrl: string) => {
        if (!user) {
            toast.showError('Not signed in', 'Sign in again to submit homework.');
            return;
        }

        try {
            setUploadingAssignmentId(assignmentId);
            await assignmentService.submit({
                assignment_id: assignmentId,
                user_id: user.id,
                file_url: fileUrl
            });

            setAssignments((prev) => prev.map((assignment) => (
                assignment.id === assignmentId
                    ? {
                        ...assignment,
                        status: 'submitted',
                        submission_url: fileUrl,
                        submitted_at: new Date().toISOString()
                    }
                    : assignment
            )));

            toast.showSuccess('Assignment submitted');
        } catch (err: any) {
            toast.showError('Unable to submit assignment', err.message || 'Unexpected error');
        } finally {
            setUploadingAssignmentId(null);
        }
    };

    if (!user) {
        return (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-200">
                <p className="text-gray-600">Sign in to upload your assignments.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
                        <BookOpen className="text-secondary" /> My Assignments
                    </h1>
                    <p className="text-sm text-gray-500">Review deadlines and submit your work directly.</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={loadAssignments} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </Button>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6">
                <p className="text-sm text-gray-600">Pending submissions</p>
                <p className="text-3xl font-bold text-dark">{pendingCount}</p>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-6">
                    {assignments.map((assignment) => (
                        <div
                            key={assignment.id}
                            className={`bg-white rounded-2xl p-6 shadow-sm border ${assignment.status === 'pending'
                                    ? 'border-l-4 border-l-orange-400 border-y border-r border-gray-200'
                                    : 'border-gray-200'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-xl text-dark">{assignment.title}</h3>
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${assignment.status === 'pending'
                                                ? 'bg-orange-100 text-orange-700 border-orange-200'
                                                : assignment.status === 'submitted'
                                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                    : 'bg-green-100 text-green-700 border-green-200'
                                            }`}>
                                            {assignment.status === 'pending' && 'Pending'}
                                            {assignment.status === 'submitted' && 'Submitted'}
                                            {assignment.status === 'graded' && (
                                                <span className="inline-flex items-center gap-1">
                                                    <CheckCircle size={10} /> Graded
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm max-w-2xl">{assignment.description || 'No description provided.'}</p>
                                </div>
                                <div className="text-right md:min-w-[200px]">
                                    <span className="text-xs text-gray-500 block mb-1">Due Date</span>
                                    <span className={`text-sm font-bold flex items-center justify-end gap-1 ${isOverdue(assignment.due_date) ? 'text-red-500' : 'text-gray-700'
                                        }`}>
                                        {isOverdue(assignment.due_date) && <AlertCircle size={14} />}
                                        {formatDueDate(assignment.due_date)}
                                    </span>
                                </div>
                            </div>

                            {assignment.file_url && (
                                <button
                                    className="flex items-center gap-2 text-sm text-primary font-medium mb-4"
                                    onClick={() => window.open(assignment.file_url!, '_blank')}
                                >
                                    <ExternalLink size={14} /> View brief
                                </button>
                            )}

                            {assignment.status === 'pending' && (
                                <div className="space-y-4">
                                    <FileUpload
                                        options={{
                                            bucket: 'assignments',
                                            allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.zip'],
                                            maxSize: 10 * 1024 * 1024,
                                            onSuccess: (fileUrl) => handleFileUpload(assignment.id, fileUrl),
                                            onError: handleUploadError,
                                            onProgress: (progress) => {
                                                if (progress > 0 && progress < 100) {
                                                    setUploadingAssignmentId(assignment.id);
                                                }
                                                if (progress === 100) {
                                                    setUploadingAssignmentId(null);
                                                }
                                            }
                                        }}
                                        className="mb-2"
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <Upload size={20} className="text-gray-400" />
                                            <p className="text-sm text-gray-600">Drop file or click to upload</p>
                                            <p className="text-xs text-gray-400">PDF, DOCX, ZIP · 10 MB max</p>
                                        </div>
                                    </FileUpload>
                                    <p className="text-xs text-gray-500 text-right">
                                        Uploading the file will submit automatically.
                                    </p>
                                </div>
                            )}

                            {assignment.status === 'submitted' && assignment.submission_url && (
                                <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
                                    <FileText size={16} className="text-blue-600" />
                                    <span className="text-sm font-medium text-blue-900">Submitted successfully</span>
                                    <a
                                        href={assignment.submission_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 underline hover:text-blue-800 ml-auto"
                                    >
                                        View file
                                    </a>
                                </div>
                            )}

                            {assignment.status === 'graded' && assignment.submission_url && (
                                <div className="space-y-3">
                                    <p className="text-gray-500 text-xs">Submitted on {assignment.submitted_at ? formatDueDate(assignment.submitted_at) : '—'}</p>
                                    <div className="bg-gray-50 p-3 rounded-lg inline-flex items-center gap-3">
                                        <FileText size={16} className="text-gray-400" />
                                        <a
                                            href={assignment.submission_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium underline text-primary"
                                        >
                                            View submission
                                        </a>
                                    </div>
                                    {(assignment.grade || assignment.feedback) && (
                                        <div className="flex flex-col md:items-end">
                                            {assignment.grade && (
                                                <div className="text-center bg-white border border-gray-200 rounded-xl px-6 py-3">
                                                    <span className="block text-xs text-gray-500 uppercase font-bold">Score</span>
                                                    <span className="text-2xl font-display font-bold text-success">{assignment.grade}</span>
                                                </div>
                                            )}
                                            {assignment.feedback && (
                                                <p className="text-xs text-gray-500 italic mt-2 md:text-right">“{assignment.feedback}”</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};