import React, { useEffect, useMemo, useState } from 'react';
import { Video, Eye, Upload, X, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { FileUpload } from '../ui/FileUpload';
import { useToast } from '../../src/context/ToastContext';
import { recordingService, RecordingWithSession, SessionOption } from '../../src/services/recording-service';

interface RecordingFormState {
  title: string;
  sessionId: string;
  duration: string;
}

const DEFAULT_FORM: RecordingFormState = {
  title: '',
  sessionId: '',
  duration: ''
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const RecordingManagement: React.FC = () => {
  const toast = useToast();
  const [recordings, setRecordings] = useState<RecordingWithSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<RecordingFormState>(DEFAULT_FORM);
  const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([]);
  const [fetchingSessions, setFetchingSessions] = useState(false);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const result = await recordingService.list({ includeHidden: true, limit: 60 });
      setRecordings(result);
    } catch (err: any) {
      toast.showError('Failed to load recordings', err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      setFetchingSessions(true);
      const result = await recordingService.fetchSessionOptions();
      setSessionOptions(result);
    } catch (err: any) {
      toast.showError('Failed to load sessions', err.message || 'Unexpected error');
    } finally {
      setFetchingSessions(false);
    }
  };

  useEffect(() => {
    loadRecordings();
    loadSessions();
  }, []);

  const isFormValid = form.title.trim().length > 0 && form.sessionId;

  const handleFileUpload = async (fileUrl: string) => {
    if (!isFormValid) {
      toast.showError('Missing details', 'Select a session and add a title before uploading the file.');
      return;
    }

    try {
      setUploading(true);
      const created = await recordingService.create({
        session_id: form.sessionId,
        video_url: fileUrl,
        title: form.title,
        duration: form.duration || undefined,
        visible_to_students: true
      });

      setRecordings(prev => [created, ...prev]);
      toast.showSuccess('Recording uploaded');
      setForm(DEFAULT_FORM);
      setShowUploadModal(false);
    } catch (err: any) {
      toast.showError('Upload failed', err.message || 'Could not save recording');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadError = (error: string) => {
    toast.showError('Upload failed', error);
  };

  const toggleVisibility = async (recording: RecordingWithSession) => {
    try {
      await recordingService.toggleVisibility(recording.id, !recording.visible_to_students);
      setRecordings(prev => prev.map(r =>
        r.id === recording.id ? { ...r, visible_to_students: !r.visible_to_students } : r
      ));
    } catch (err: any) {
      toast.showError('Update failed', err.message || 'Could not update visibility');
    }
  };

  const visibleRecordings = useMemo(() => recordings, [recordings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Class Recordings</h1>
          <p className="text-sm text-gray-500">Manage the library students can access after class.</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={loadRecordings}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={16} /> Upload New
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse h-64" />
          ))}
        </div>
      ) : visibleRecordings.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleRecordings.map((recording) => (
            <div key={recording.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group">
              <div className="bg-gray-800 h-40 relative flex items-center justify-center">
                <Video className="text-white opacity-50" size={40} />
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {recording.duration || '—'}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="font-bold text-dark mb-0.5">
                    {recording.title || recording.session?.title || 'Untitled Recording'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {recording.session?.title ? `${recording.session.title} • ` : ''}
                    {formatDate(recording.session?.session_date || recording.uploaded_at)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={recording.visible_to_students}
                        onChange={() => toggleVisibility(recording)}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                    <span className="text-xs font-medium text-gray-600">
                      {recording.visible_to_students ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => window.open(recording.video_url, '_blank')}>
                    <Eye size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <Video size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No recordings found. Upload the first recording to get started.</p>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-dark">Upload New Recording</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recording Title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Session 7: Advanced AI Concepts"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm(prev => ({ ...prev, duration: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., 1:30:45"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session
                  </label>
                  <select
                    value={form.sessionId}
                    onChange={(e) => setForm(prev => ({ ...prev, sessionId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={fetchingSessions}
                  >
                    <option value="" disabled>
                      {fetchingSessions ? 'Loading sessions...' : 'Select a session'}
                    </option>
                    {sessionOptions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.title} • {formatDate(session.session_date)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video File
                </label>
                <FileUpload
                  options={{
                    bucket: 'recordings',
                    allowedTypes: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
                    maxSize: 500 * 1024 * 1024,
                    onSuccess: handleFileUpload,
                    onError: handleUploadError
                  }}
                  disabled={!isFormValid || uploading}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!isFormValid || uploading}
                  onClick={() => toast.showInfo('Awaiting file', 'Upload the video file to finish saving this recording.')}
                >
                  {uploading ? 'Uploading...' : 'Upload Recording'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
