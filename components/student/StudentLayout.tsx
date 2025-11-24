import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard, Calendar, Video, BookOpen, CreditCard,
  LifeBuoy, User, LogOut, Menu, X, Rocket
} from 'lucide-react';
import { StudentView, Profile } from '../../types';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { useStudentData, StudentDataState } from '@/src/hooks/useStudentData';
import { User as SupabaseUser } from '@supabase/supabase-js';

import { StudentDashboard } from './StudentDashboard';
import { StudentSchedule } from './StudentSchedule';
import { StudentRecordings } from './StudentRecordings';
import { StudentAssignments } from './StudentAssignments';
import { StudentPayments } from './StudentPayments';
import { StudentSupport } from './StudentSupport';
import { StudentProfile } from './StudentProfile';
import { useStudentPayments, StudentPaymentStats } from '@/src/hooks/useStudentPayments';
import { StudentPaymentsProvider } from '@/src/context/StudentPaymentsContext';

interface StudentLayoutProps {
  user: SupabaseUser;
  profile: Profile;
  onSignOut: () => Promise<void>;
}

type DashboardData = Pick<StudentDataState,
  'profile' | 'upcomingSession' | 'pendingAssignments' | 'recentRecordings' | 'loading' | 'error' | 'retryFetch' | 'hasError' | 'canRetry'
> & {
  paymentStats: StudentPaymentStats;
  paymentsLoading: boolean;
};

export const StudentLayout: React.FC<StudentLayoutProps> = ({ user, profile, onSignOut }) => {
  const [currentView, setCurrentView] = useState<StudentView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const studentData = useStudentData();
  const studentPayments = useStudentPayments();
  const resolvedProfile = studentData.profile || profile;

  const dashboardData: DashboardData = useMemo(() => ({
    profile: resolvedProfile,
    upcomingSession: studentData.upcomingSession,
    pendingAssignments: studentData.pendingAssignments,
    recentRecordings: studentData.recentRecordings,
    progress: studentData.progress,
    loading: studentData.loading,
    error: studentData.error,
    retryFetch: studentData.retryFetch,
    hasError: studentData.hasError,
    canRetry: studentData.canRetry,
    paymentStats: studentPayments.stats,
    paymentsLoading: studentPayments.loading
  }), [resolvedProfile, studentData.upcomingSession, studentData.pendingAssignments, studentData.recentRecordings, studentData.progress, studentData.loading, studentData.error, studentData.retryFetch, studentData.hasError, studentData.canRetry, studentPayments.stats, studentPayments.loading]);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  const welcomeMessage = resolvedProfile?.name || user.email?.split('@')[0] || 'Student';

  const menuItems: { id: StudentView; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'schedule', label: 'My Schedule', icon: Calendar },
    { id: 'recordings', label: 'Recordings', icon: Video },
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'support', label: 'Get Help', icon: LifeBuoy },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <StudentDashboard
            onChangeView={setCurrentView}
            data={dashboardData}
            fallbackEmail={user.email || undefined}
          />
        );
      case 'schedule': return <StudentSchedule />;
      case 'recordings': return <StudentRecordings />;
      case 'assignments': return <StudentAssignments />;
      case 'payments': return <StudentPayments />;
      case 'support': return <StudentSupport />;
      case 'profile':
        return (
          <StudentProfile
            profile={resolvedProfile}
            onUpdateProfile={studentData.updateProfile}
            updatingProfile={studentData.updatingProfile}
          />
        );
      default:
        return (
          <StudentDashboard
            onChangeView={setCurrentView}
            data={dashboardData}
            fallbackEmail={user.email || undefined}
          />
        );
    }
  };

  return (
    <StudentPaymentsProvider value={studentPayments}>
      <div className="min-h-screen bg-background flex font-sans text-gray-800">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64 group'
            }`}
        >
          <div className="h-full flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
                  <Rocket size={18} />
                </div>
                <span className={`font-display font-bold text-lg text-dark transition-opacity duration-300 ${!sidebarOpen && 'lg:opacity-0 lg:group-hover:opacity-100'}`}>
                  Student<span className="text-primary">Hub</span>
                </span>
              </div>
              <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6">
              <nav className="space-y-1 px-3">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${currentView === item.id
                      ? 'bg-primary text-white shadow-md shadow-primary/30 font-semibold'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-primary'
                      }`}
                    title={item.label}
                  >
                    <item.icon size={22} className="shrink-0" />
                    <span className={`whitespace-nowrap transition-all duration-300 ${!sidebarOpen && 'lg:opacity-0 lg:group-hover:opacity-100 lg:w-0 lg:group-hover:w-auto'}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl ${signingOut ? 'text-gray-400 cursor-wait' : 'text-gray-500 hover:bg-red-50 hover:text-red-500'} transition-colors duration-200`}
              >
                <LogOut size={22} className="shrink-0" />
                <span className={`whitespace-nowrap transition-all duration-300 ${!sidebarOpen && 'lg:opacity-0 lg:group-hover:opacity-100'}`}>
                  {signingOut ? 'Signing Out…' : 'Sign Out'}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shadow-sm relative z-30">
            <button
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-dark">Welcome, {welcomeMessage}!</p>
                <p className="text-xs text-gray-500">{resolvedProfile?.role === 'student' ? 'Student Portal' : 'Learner Portal'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-accent p-0.5 border-2 border-white shadow-sm">
                <div className="w-full h-full rounded-full bg-white/70 flex items-center justify-center text-sm font-semibold text-dark">
                  {welcomeMessage.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 relative">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-primary/5 to-secondary/5 -z-10"></div>

            <div className="max-w-6xl mx-auto">
              <ErrorBoundary>
                {renderContent()}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </StudentPaymentsProvider>
  );
};