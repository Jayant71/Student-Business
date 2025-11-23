import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { sessionService } from '../services/session-service';
import { Session } from '../../types';

interface ScheduleData {
  upcomingSessions: Session[];
  nextSession: Session | null;
  loading: boolean;
  error: string | null;
}

export const useStudentSchedule = (): ScheduleData => {
  const { user } = useAuth();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [nextSession, setNextSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchScheduleData = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date().toISOString().split('T')[0];
        const sessionsData = await sessionService.list({ fromDate: today, limit: 10 });
        setUpcomingSessions(sessionsData);

        // Find the next session (first upcoming session that hasn't started yet)
        const now = new Date();
        const nextSessionData = sessionsData.find(session => {
          const sessionDateTime = new Date(`${session.session_date}T${session.start_time}`);
          return sessionDateTime > now;
        });

        setNextSession(nextSessionData || null);

      } catch (err) {
        console.error('Error fetching schedule data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule data');
      } finally {
        setLoading(false);
      }
    };

    fetchScheduleData();

    // Set up real-time subscription for sessions
    const subscription = supabase
      .channel('sessions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions'
        },
        () => {
          fetchScheduleData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { 
    upcomingSessions, 
    nextSession, 
    loading, 
    error 
  };
};