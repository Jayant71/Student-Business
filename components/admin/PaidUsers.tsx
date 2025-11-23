import React, { useEffect, useMemo, useState } from 'react';
import { Download, Users, RefreshCw, Loader2, AlertCircle, Search, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '@/src/lib/supabase';
import { useToast } from '../../src/context/ToastContext';

interface PaymentRecord {
  id: string;
  payment_id?: string | null;
  user_id?: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paid_at?: string | null;
  created_at: string;
  profiles?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at: string;
  } | null;
}

const formatCurrency = (value: number = 0) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  });

const formatDate = (input?: string | null) =>
  input ? new Date(input).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const PaidUsers: React.FC = () => {
  const toast = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          payment_id,
          user_id,
          amount,
          status,
          paid_at,
          created_at,
          profiles:profiles!payments_user_id_fkey (
            id,
            name,
            email,
            phone,
            created_at
          )
        `)
        .order('paid_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const normalized = (data || []).map((record) => ({
        ...record,
        amount: typeof record.amount === 'number' ? record.amount : Number(record.amount) || 0
      }));

      setPayments(normalized);
    } catch (err) {
      console.error('Failed to load payments', err);
      const message = err instanceof Error ? err.message : 'Unable to load payments';
      setError(message);
      toast.showError('Failed to load paid users', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const paidStudents = useMemo(() => payments.filter((payment) => payment.status === 'paid'), [payments]);
  const pendingInvoices = useMemo(() => payments.filter((payment) => payment.status === 'pending'), [payments]);

  const visiblePayments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      if (!matchesStatus) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        payment.profiles?.name,
        payment.profiles?.email,
        payment.payment_id,
        payment.id
      ];
      return haystack.some((value) => {
        if (typeof value !== 'string') {
          return false;
        }
        return value.toLowerCase().includes(normalizedSearch);
      });
    });
  }, [payments, searchTerm, statusFilter]);

  const isFiltered = statusFilter !== 'all' || searchTerm.trim().length > 0;

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const totalEnrolled = paidStudents.length;
  const thisMonth = paidStudents.filter((payment) => {
    if (!payment.paid_at && !payment.created_at) {
      return false;
    }
    const paidDate = new Date(payment.paid_at || payment.created_at);
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return paidDate >= thirtyDaysAgo && paidDate <= today;
  }).length;

  const exportCsv = () => {
    if (!payments.length) {
      toast.showInfo('Nothing to export yet');
      return;
    }

    const header = ['Name', 'Email', 'Amount', 'Status', 'Paid At', 'Payment ID'];
    const rows = payments.map((payment) => [
      payment.profiles?.name || 'Unknown',
      payment.profiles?.email || '—',
      payment.amount.toString(),
      payment.status,
      payment.paid_at || payment.created_at,
      payment.payment_id || payment.id
    ]);

    const csvContent = [header, ...rows]
      .map((cols) => cols.map((value) => `"${value?.toString().replace(/"/g, '""') || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `paid-users-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark">Enrolled Students</h1>
          <p className="text-sm text-gray-500">Synced with Supabase payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportCsv}>
            <Download size={16} /> Export CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={loadPayments}>
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={16} className="text-red-500" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Total Enrolled</p>
          <div className="flex items-center gap-2">
            <Users size={32} className="text-primary" />
            <h3 className="text-4xl font-bold text-dark">{loading ? '—' : totalEnrolled}</h3>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Paid in last 30 days</p>
          <h3 className="text-3xl font-bold text-secondary">{loading ? '—' : thisMonth}</h3>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-500 text-sm mb-1">Pending invoices</p>
          <h3 className="text-3xl font-bold text-amber-600">{loading ? '—' : pendingInvoices.length}</h3>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Filter size={16} /> Payment Activity
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Showing {visiblePayments.length} of {payments.length}</span>
              {loading && (
                <span className="flex items-center gap-1">
                  <Loader2 size={14} className="animate-spin" /> Loading
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by student, email, or payment ID"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-primary outline-none bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'all' | 'paid' | 'pending' | 'failed')}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:border-primary outline-none"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={resetFilters}
              disabled={!isFiltered}
            >
              <RefreshCw size={14} /> Clear Filters
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Paid / Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 size={24} className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : visiblePayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {isFiltered ? 'No records match your filters.' : 'No payment records yet.'}
                  </td>
                </tr>
              ) : (
                visiblePayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-dark">
                      {payment.profiles?.name || 'Unknown student'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {payment.profiles?.email || '—'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-dark">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${payment.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : payment.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {payment.paid_at ? formatDate(payment.paid_at) : formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
