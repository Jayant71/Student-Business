import React from 'react';
import { Users, Mail, MessageSquare, DollarSign, Calendar, TrendingUp, UserPlus, CreditCard, AlertCircle, RefreshCw } from 'lucide-react';

import { useAdminData } from '../../src/hooks/useAdminData';
import { CTASubmission, Payment } from '../../types';
import { DashboardSkeleton } from '@/src/components/ui/LoadingSkeleton';
import { Button } from '../ui/Button';

export const Dashboard: React.FC = () => {
  const { stats, loading, error, recentActivity, ctaSubmissions, payments, sessions, retryFetch, hasError, canRetry } = useAdminData();

  const kpis = [
    {
      label: 'Imported Leads',
      value: stats?.total_leads?.toString() || '0',
      change: stats?.lead_change ? `${stats.lead_change > 0 ? '+' : ''}${stats.lead_change}%` : '+0%',
      icon: Users,
      color: 'blue'
    },
    {
      label: 'Emails Sent',
      value: stats?.emails_sent?.toString() || '0',
      change: stats?.email_change ? `${stats.email_change > 0 ? '+' : ''}${stats.email_change}%` : '+0%',
      icon: Mail,
      color: 'purple'
    },
    {
      label: 'CTA Approved',
      value: stats?.cta_approved?.toString() || '0',
      change: stats?.cta_change ? `${stats.cta_change > 0 ? '+' : ''}${stats.cta_change}%` : '+0%',
      icon: MessageSquare,
      color: 'orange'
    },
    {
      label: 'Paid Students',
      value: stats?.payments_paid?.toString() || '0',
      change: stats?.payment_change ? `${stats.payment_change > 0 ? '+' : ''}${stats.payment_change}%` : '+0%',
      icon: DollarSign,
      color: 'green'
    },
  ];

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cta_submission':
        return <UserPlus size={16} className="text-blue-500" />;
      case 'payment':
        return <CreditCard size={16} className="text-green-500" />;
      case 'imported_lead':
        return <Users size={16} className="text-purple-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (hasError) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Dashboard Loading Failed
          </h2>

          <p className="text-gray-600 mb-6">
            {error || 'Unable to load dashboard data. Please check your connection and try again.'}
          </p>

          <div className="flex gap-3 justify-center">
            {canRetry && (
              <Button
                onClick={retryFetch}
                className="flex items-center gap-2"
                variant="outline"
              >
                <RefreshCw size={16} />
                Retry
              </Button>
            )}

            <Button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Use real activity feed from RPC
  const displayActivities = recentActivity && recentActivity.length > 0 ? recentActivity.slice(0, 8) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-dark">Dashboard Overview</h1>
        <p className="text-gray-500">Welcome back, here's what's happening today.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-dark">{kpi.value}</h3>
              <span className={`text-xs font-medium ${kpi.change.startsWith('+') ? 'text-green-500' : kpi.change.startsWith('-') ? 'text-red-500' : 'text-gray-500'}`}>
                {kpi.change} from last week
              </span>
            </div>
            <div className={`w-12 h-12 rounded-lg bg-${kpi.color}-50 flex items-center justify-center text-${kpi.color}-600`}>
              <kpi.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Timeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-dark mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            Recent Activity
          </h3>
          <div className="space-y-6">
            {displayActivities.length > 0 ? (
              displayActivities.map((item, index) => (
                <div key={item.id + index} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-dark">{item.description}</p>
                    <p className="text-xs text-gray-400">{formatTimeAgo(item.time)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-dark mb-6 flex items-center gap-2">
            <Calendar size={18} className="text-secondary" />
            Upcoming Sessions
          </h3>
          <div className="space-y-4">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-xs text-primary font-bold uppercase mb-1">
                    {new Date(session.session_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}, {session.start_time}
                  </div>
                  <div className="font-medium text-dark">{session.title}</div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                    <Users size={12} /> Session
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No upcoming sessions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
