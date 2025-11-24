import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CTASubmission, ImportedLead, Payment, Session } from '../../types';
import { useToast } from '../context/ToastContext';
import { errorLogger } from '../services/error-logger';

interface AdminStats {
  total_leads: number;
  emails_sent: number;
  cta_approved: number;
  payments_paid: number;
  lead_change: number;
  email_change: number;
  cta_change: number;
  payment_change: number;
  last_updated: string;
}

interface ActivityItem {
  type: 'cta_submission' | 'payment' | 'imported_lead';
  id: string;
  name: string;
  email: string;
  description: string;
  time: string;
  metadata: any;
}

export const useAdminData = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [ctaSubmissions, setCTASubmissions] = useState<CTASubmission[]>([]);
  const [importedLeads, setImportedLeads] = useState<ImportedLead[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  
  const toast = useToast();

  const logError = useCallback(async (error: Error, context: string) => {
    await errorLogger.logErrorAuto(error, {
      type: 'api-error',
      severity: 'high',
      context: {
        component: 'useAdminData',
        operation: context,
        retryCount
      }
    });
  }, [retryCount]);

  const fetchData = useCallback(async (isRetry: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch stats using new RPC function with trends
      const { data: statsData, error: statsError } = await supabase.rpc('get_admin_stats');
      if (statsError) throw statsError;
      setStats(statsData);

      // Fetch recent activity feed
      const { data: activityData, error: activityError } = await supabase.rpc('get_recent_activity', { limit_count: 10 });
      if (activityError) throw activityError;
      setRecentActivity(activityData || []);

      // Fetch recent CTA submissions
      const { data: ctaData, error: ctaError } = await supabase
        .from('cta_submissions')
        .select('*')
        .order('submission_date', { ascending: false })
        .limit(10);
      
      if (ctaError) throw ctaError;
      setCTASubmissions(ctaData || []);

      // Fetch recent imported leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('imported_leads')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(10);
      
      if (leadsError) throw leadsError;
      setImportedLeads(leadsData || []);

      // Fetch recent payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // Fetch upcoming sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('status', 'upcoming')
        .order('session_date', { ascending: true })
        .limit(5);
      
      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      if (isRetry) {
        toast.showSuccess('Data refreshed successfully');
      }

    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setError(err.message);
      
      // Log error
      await logError(err, 'fetchData');
      
      // Show error toast
      toast.showError('Failed to load dashboard data', err.message);
      
    } finally {
      setLoading(false);
    }
  }, [toast, logError]);

  const retryFetch = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const ctaSubscription = supabase
      .channel('cta_submissions_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cta_submissions' },
        () => {
          fetchData();
          toast.showInfo('CTA submissions updated');
        }
      )
      .subscribe();

    const leadsSubscription = supabase
      .channel('imported_leads_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'imported_leads' },
        () => {
          fetchData();
          toast.showInfo('Imported leads updated');
        }
      )
      .subscribe();

    const paymentsSubscription = supabase
      .channel('payments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          fetchData();
          toast.showInfo('Payments updated');
        }
      )
      .subscribe();

    const sessionsSubscription = supabase
      .channel('sessions_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          fetchData();
          toast.showInfo('Sessions updated');
        }
      )
      .subscribe();

    return () => {
      ctaSubscription.unsubscribe();
      leadsSubscription.unsubscribe();
      paymentsSubscription.unsubscribe();
      sessionsSubscription.unsubscribe();
    };
  }, [fetchData, toast]);

  return {
    stats,
    loading,
    error,
    recentActivity,
    ctaSubmissions,
    importedLeads,
    payments,
    sessions,
    refetch: fetchData,
    retryFetch,
    retryCount,
    hasError: !!error,
    canRetry: retryCount < 3
  };
};
