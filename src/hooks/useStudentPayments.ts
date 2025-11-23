import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorLogger } from '../services/error-logger';
import { Payment } from '../../types';

export interface StudentPaymentStats {
  totalPaid: number;
  pendingAmount: number;
  hasPending: boolean;
  lastPaymentAt: string | null;
  nextDuePayment: Payment | null;
}

const INITIAL_STATS: StudentPaymentStats = {
  totalPaid: 0,
  pendingAmount: 0,
  hasPending: false,
  lastPaymentAt: null,
  nextDuePayment: null
};

export interface StudentPaymentsState {
  payments: Payment[];
  stats: StudentPaymentStats;
  loading: boolean;
  error: string | null;
  retryFetch: () => Promise<void>;
  retryCount: number;
  hasError: boolean;
  canRetry: boolean;
}

const normalizeAmount = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const normalizePayment = (record: any): Payment => ({
  id: record.id,
  user_id: record.user_id,
  payment_request_id: record.payment_request_id,
  payment_id: record.payment_id,
  amount: normalizeAmount(record.amount),
  status: record.status,
  payment_url: record.payment_url,
  paid_at: record.paid_at,
  webhook_payload: record.webhook_payload,
  created_at: record.created_at
});

const calculateStats = (records: Payment[]): StudentPaymentStats => {
  if (!records.length) {
    return INITIAL_STATS;
  }

  const paidPayments = records.filter((payment) => payment.status === 'paid');
  const pendingPayments = records.filter((payment) => payment.status === 'pending');

  const totalPaid = paidPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const lastPaymentAt = paidPayments.length
    ? paidPayments[0].paid_at || paidPayments[0].created_at || null
    : null;

  const nextDuePayment = pendingPayments.length ? pendingPayments[0] : null;

  return {
    totalPaid,
    pendingAmount,
    hasPending: pendingPayments.length > 0,
    lastPaymentAt,
    nextDuePayment
  };
};

export const useStudentPayments = (): StudentPaymentsState => {
  const { user } = useAuth();
  const toast = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<StudentPaymentStats>(INITIAL_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const logError = useCallback(
    async (err: Error, context: string) => {
      await errorLogger.logErrorAuto(err, {
        type: 'api-error',
        severity: 'medium',
        context: {
          component: 'useStudentPayments',
          operation: context,
          userId: user?.id,
          retryCount
        }
      });
    },
    [user?.id, retryCount]
  );

  const fetchPayments = useCallback(
    async (isRetry: boolean = false) => {
      if (!user) {
        setLoading(false);
        setPayments([]);
        setStats(INITIAL_STATS);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (queryError) {
          throw queryError;
        }

        const normalized = (data || []).map(normalizePayment);
        setPayments(normalized);
        setStats(calculateStats(normalized));

        if (isRetry) {
          toast.showSuccess('Payments refreshed');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load payments';
        setError(message);
        await logError(err as Error, 'fetchPayments');
        toast.showError('Unable to load payments', message);
      } finally {
        setLoading(false);
      }
    },
    [user, toast, logError]
  );

  const retryFetch = useCallback(async () => {
    setRetryCount((prev) => prev + 1);
    await fetchPayments(true);
  }, [fetchPayments]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const channel = supabase
      .channel(`student-payments-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `user_id=eq.${user.id}` },
        () => fetchPayments()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, fetchPayments]);

  return {
    payments,
    stats,
    loading,
    error,
    retryFetch,
    retryCount,
    hasError: !!error,
    canRetry: retryCount < 3
  };
};
