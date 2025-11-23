import React, { useEffect, useMemo, useState } from 'react';
import { Video, Search, Play, Clock, RefreshCw } from 'lucide-react';
import { recordingService, RecordingWithSession } from '../../src/services/recording-service';
import { useToast } from '../../src/context/ToastContext';

export const StudentRecordings: React.FC = () => {
    const toast = useToast();
    const [recordings, setRecordings] = useState<RecordingWithSession[]>([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const filters = useMemo(() => {
        const tags = new Set<string>();
        recordings.forEach(recording => {
            const source = recording.title || recording.session?.title;
            if (source) {
                const tag = source.split(':')[0]?.trim();
                if (tag) {
                    tags.add(tag);
                }
            }
        });
        return ['All', ...Array.from(tags)];
    }, [recordings]);

    const loadRecordings = async () => {
        try {
            setLoading(true);
            const result = await recordingService.list({ includeHidden: false, limit: 60 });
            setRecordings(result);
        } catch (err: any) {
            toast.showError('Failed to load recordings', err.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecordings();
    }, []);

    const formattedRecordings = useMemo(() => {
        return recordings
            .filter(recording => {
                const text = `${recording.title || ''} ${recording.session?.title || ''}`.toLowerCase();
                const matchesSearch = text.includes(searchTerm.toLowerCase());
                const tag = (recording.title || recording.session?.title || '').split(':')[0]?.trim();
                const matchesFilter = activeFilter === 'All' || tag === activeFilter;
                return matchesSearch && matchesFilter;
            });
    }, [recordings, searchTerm, activeFilter]);

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
                        <Video className="text-red-500" /> Class Recordings
                    </h1>
                    <p className="text-sm text-gray-500">Catch up on any class you missed.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search topics..."
                            className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary outline-none w-full md:w-64"
                        />
                    </div>
                    <button
                        onClick={loadRecordings}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-primary"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {filters.map(filter => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeFilter === filter
                                ? 'bg-dark text-white shadow-lg'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-200 h-64 animate-pulse" />
                    ))}
                </div>
            ) : formattedRecordings.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {formattedRecordings.map((recording) => (
                        <div key={recording.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 group hover:-translate-y-1 transition-transform duration-300">
                            <button
                                className="relative aspect-video bg-gray-900 group-hover:brightness-90 transition-all w-full"
                                onClick={() => window.open(recording.video_url, '_blank')}
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play fill="white" className="text-white ml-1" size={20} />
                                    </div>
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                                    {recording.duration || '—'}
                                </div>
                            </button>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-dark line-clamp-1">
                                        {recording.title || recording.session?.title || 'Untitled Session'}
                                    </h3>
                                </div>
                                <p className="text-gray-500 text-xs mb-4 line-clamp-2">
                                    {recording.session?.description || 'Recording from your Future Founders cohort.'}
                                </p>
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(recording.session?.session_date || recording.uploaded_at)}</span>
                                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-600">
                                        {(recording.title || recording.session?.title || 'Session').split(':')[0]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                    <Video size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 text-sm">No recordings available yet. New sessions will appear here after they go live.</p>
                </div>
            )}
        </div>
    );
};