import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorLogger } from '../services/error-logger';
import { assignmentService } from '../services/assignment-service';
import { sessionService } from '../services/session-service';
import { Profile as UserProfile, StudentAssignmentView, Session } from '../../types';

interface Recording {
  id: string;
  video_url: string;
  session_id: string;
  uploaded_at: string;
  title?: string;
  session_date?: string;
}

export interface StudentDataState {
  profile: UserProfile | null;
  upcomingSession: any | null;
  pendingAssignments: StudentAssignmentView[];
  recentRecordings: Recording[];
  loading: boolean;
  error: string | null;
  retryFetch: () => Promise<void>;
  retryCount: number;
  hasError: boolean;
  canRetry: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  updatingProfile: boolean;
}

export const useStudentData = (): StudentDataState => {
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [upcomingSession, setUpcomingSession] = useState<Session | null>(null);
  const [pendingAssignments, setPendingAssignments] = useState<StudentAssignmentView[]>([]);
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  const toast = useToast();

  const logError = useCallback(async (error: Error, context: string) => {
    await errorLogger.logErrorAuto(error, {
      type: 'api-error',
      severity: 'medium',
      context: {
        component: 'useStudentData',
        operation: context,
        userId: user?.id,
        retryCount
      }
    });
  }, [user?.id, retryCount]);

  const fetchData = useCallback(async (isRetry: boolean = false) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Use profile from AuthContext if available, otherwise fetch
      let userProfile = authProfile as UserProfile | null;
      if (!userProfile) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        userProfile = profileData;
      }
      setProfile(userProfile);

      // Fetch upcoming session via shared service
      const upcomingSessions = await sessionService.list({ status: 'upcoming', fromDate: new Date().toISOString().split('T')[0], limit: 1 });
      setUpcomingSession(upcomingSessions?.[0] || null);

      const studentAssignments = await assignmentService.listForStudent(user.id, 15);
      setPendingAssignments(studentAssignments.filter((assignment) => assignment.status === 'pending'));

      // Fetch recent recordings with session information
      const { data: recordings, error: recordingsError } = await supabase
        .from('recordings')
        .select(`
          *,
          sessions!inner(
            title,
            session_date,
            description
          )
        `)
        .eq('visible_to_students', true)
        .order('uploaded_at', { ascending: false })
        .limit(3);

      if (recordingsError) throw recordingsError;

      const recentRecordingsData = recordings?.map((recording: any) => ({
        id: recording.id,
        video_url: recording.video_url,
        session_id: recording.session_id,
        uploaded_at: recording.uploaded_at,
        title: recording.title || recording.sessions?.title || 'Untitled Session',
        session_date: recording.sessions?.session_date,
        duration: recording.duration
      })) || [];

      setRecentRecordings(recentRecordingsData);

      if (isRetry) {
        toast.showSuccess('Data refreshed successfully');
      }

    } catch (err) {
      console.error('Error fetching student data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch student data';
      setError(errorMessage);
      
      // Log error
      await logError(err as Error, 'fetchData');
      
      // Show error toast
      toast.showError('Failed to load student data', errorMessage);
      
    } finally {
      setLoading(false);
    }
  }, [user, authProfile, toast, logError]);

  const retryFetch = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    await fetchData(true);
  }, [fetchData]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) {
      toast.showError('Unable to update profile', 'You are not signed in.');
      return false;
    }

    setUpdatingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast.showSuccess('Profile updated');
      return true;
    } catch (err) {
      console.error('Error updating profile:', err);
      await logError(err as Error, 'updateProfile');
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      toast.showError('Update failed', errorMessage);
      return false;
    } finally {
      setUpdatingProfile(false);
    }
  }, [user, toast, logError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    upcomingSession,
    pendingAssignments,
    recentRecordings,
    loading,
    error,
    retryFetch,
    retryCount,
    hasError: !!error,
    canRetry: retryCount < 3,
    updateProfile,
    updatingProfile
  };
};
