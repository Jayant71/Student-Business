import React, { useState, useEffect } from 'react';
import { DollarSign, Send, Copy, CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { paymentService, PaymentLink, PaymentLinkRequest, PaymentStats } from '../../src/services';
import { supabase } from '@/src/lib/supabase';

export const PaymentLinks: React.FC = () => {
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNewLinkForm, setShowNewLinkForm] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [paymentSummary, setPaymentSummary] = useState({
    paidAmount: 0,
    pendingAmount: 0,
    paidCount: 0,
    pendingCount: 0
  });
  const [newLink, setNewLink] = useState<PaymentLinkRequest>({
    amount: 199,
    purpose: 'Course Enrollment',
    buyer_name: '',
    email: '',
    phone: '',
    redirect_url: 'http://localhost:3000/payment-success',
    webhook: 'http://localhost:5000/api/webhooks/payment/webhook'
  });

  useEffect(() => {
    loadPaymentLinks();
    loadStats();
    loadPaymentSummary();
  }, []);

  const loadPaymentLinks = async () => {
    setLoading(true);
    try {
      const response = await paymentService.getPaymentLinks();
      if (response.data) {
        setPaymentLinks(response.data);
      }
    } catch (err) {
      setError('Failed to load payment links');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await paymentService.getStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadPaymentSummary = async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const { data, error } = await supabase
        .from('payments')
        .select('amount, status');

      if (error) {
        throw error;
      }

      const summary = (data || []).reduce(
        (acc, payment) => {
          const amountValue = typeof payment.amount === 'number' ? payment.amount : Number(payment.amount) || 0;
          if (payment.status === 'paid') {
            acc.paidAmount += amountValue;
            acc.paidCount += 1;
          } else if (payment.status === 'pending') {
            acc.pendingAmount += amountValue;
            acc.pendingCount += 1;
          }
          return acc;
        },
        { paidAmount: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 }
      );
      setPaymentSummary(summary);
    } catch (err) {
      console.error('Failed to load payment summary', err);
      setSummaryError(err instanceof Error ? err.message : 'Unable to load payment summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!newLink.buyer_name || !newLink.email || !newLink.phone) {
      setError('Please fill in all required fields');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await paymentService.createPaymentLink(newLink);
      if (response.data) {
        setSuccess('Payment link created successfully!');
        setShowNewLinkForm(false);
        setNewLink({
          amount: 199,
          purpose: 'Course Enrollment',
          buyer_name: '',
          email: '',
          phone: '',
          redirect_url: 'http://localhost:3000/payment-success',
          webhook: 'http://localhost:5000/api/webhooks/payment/webhook'
        });
        loadPaymentLinks();
        loadStats();
        loadPaymentSummary();
      }
    } catch (err) {
      setError('Failed to create payment link');
    } finally {
      setCreating(false);
    }
  };

  const handleResendLink = async (linkId: string) => {
    try {
      const response = await paymentService.resendPaymentLink(linkId);
      if (response.data) {
        setSuccess('Payment link resent successfully!');
        loadPaymentSummary();
      }
    } catch (err) {
      setError('Failed to resend payment link');
    }
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setSuccess('Payment link copied to clipboard!');
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (value: number = 0) =>
    value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-dark">Payment Requests</h1>
        <Button
          variant="accent"
          className="gap-2"
          onClick={() => setShowNewLinkForm(true)}
        >
          <DollarSign size={16} /> Create New Link
        </Button>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-500" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      {summaryError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle size={16} className="text-amber-500" />
          {summaryError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryLoading ? (
          [...Array(4)].map((_, idx) => (
            <div key={idx} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase">Paid Amount</p>
              <p className="text-2xl font-bold text-dark mt-2">{formatCurrency(paymentSummary.paidAmount)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase">Pending Amount</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">{formatCurrency(paymentSummary.pendingAmount)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase">Paid Students</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{paymentSummary.paidCount}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase">Pending Invoices</p>
              <p className="text-2xl font-bold text-amber-600 mt-2">{paymentSummary.pendingCount}</p>
            </div>
          </>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Total Links</p>
                <p className="text-2xl font-bold text-dark mt-1">{stats.total_links}</p>
              </div>
              <CreditCard className="text-blue-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Paid</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.total_paid}</p>
              </div>
              <CheckCircle2 className="text-green-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.total_pending}</p>
              </div>
              <AlertCircle className="text-yellow-500" size={24} />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Conversion</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.conversion_rate}%</p>
              </div>
              <DollarSign className="text-purple-500" size={24} />
            </div>
          </div>
        </div>
      )}

      {/* New Payment Link Form */}
      {showNewLinkForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Create New Payment Link</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Student Name</label>
              <input
                type="text"
                value={newLink.buyer_name}
                onChange={(e) => setNewLink(prev => ({ ...prev, buyer_name: e.target.value }))}
                className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                placeholder="Enter student name"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
              <input
                type="email"
                value={newLink.email}
                onChange={(e) => setNewLink(prev => ({ ...prev, email: e.target.value }))}
                className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                placeholder="student@email.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
              <input
                type="tel"
                value={newLink.phone}
                onChange={(e) => setNewLink(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Amount ($)</label>
              <input
                type="number"
                value={newLink.amount}
                onChange={(e) => setNewLink(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                placeholder="199"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Purpose</label>
              <input
                type="text"
                value={newLink.purpose}
                onChange={(e) => setNewLink(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                placeholder="Course Enrollment"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setShowNewLinkForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLink}
              disabled={creating}
            >
              {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Create Link
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-500 text-sm font-semibold uppercase">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Date Created</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center">
                  <Loader2 size={24} className="animate-spin text-gray-400 mx-auto" />
                </td>
              </tr>
            ) : paymentLinks.length > 0 ? (
              paymentLinks.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-dark">{link.buyer_name}</div>
                      <div className="text-xs text-gray-500">{link.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">${link.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(link.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${link.status === 'Paid' ? 'bg-green-100 text-green-700' :
                        link.status === 'Failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                      }`}>
                      {link.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      title="Copy Link"
                      onClick={() => handleCopyLink(link.longurl)}
                    >
                      <Copy size={14} />
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      title="Resend"
                      onClick={() => handleResendLink(link.id)}
                      disabled={link.status === 'Paid'}
                    >
                      <Send size={14} />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No payment links found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
