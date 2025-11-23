import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard, Upload, Mail, List, MessageCircle, Phone,
  MessageSquare, DollarSign, Users, Calendar, FileText, Video,
  Bell, LifeBuoy, Award, Settings, LogOut, Menu, X
} from 'lucide-react';
import { AdminView, Profile } from '../../types';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Import Admin Components (Placeholders for now, will be implemented)
import { Dashboard } from './Dashboard';
import { ImportData } from './ImportData';
import { EmailSender } from './EmailSender';
import { CTAReview } from './CTAReview';
import { WhatsAppPanel } from './WhatsAppPanel';
import { AutoCalling } from './AutoCalling';
import { CRM } from './CRM';
import { PaymentLinks } from './PaymentLinks';
import { PaidUsers } from './PaidUsers';
import { SessionScheduling } from './SessionScheduling';
import { AssignmentCreation } from './AssignmentCreation';
import { RecordingManagement } from './RecordingManagement';
import { NotificationsManager } from './NotificationsManager';
import { SupportPanel } from './SupportPanel';
import { CertificateGenerator } from './CertificateGenerator';
import { AdminSettings } from './Settings';

interface AdminLayoutProps {
  onSignOut: () => Promise<void>;
  profile: Profile;
  user: SupabaseUser;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onSignOut, profile, user }) => {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const displayName = useMemo(() => profile?.name || user.email?.split('@')[0] || 'Admin', [profile?.name, user.email]);

  const menuItems: { id: AdminView; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'import', label: 'Import Data', icon: Upload },
    { id: 'email', label: 'Email Sender', icon: Mail },
    { id: 'cta', label: 'Enquiries', icon: List },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'calling', label: 'Auto Calling', icon: Phone },
    { id: 'crm', label: 'CRM / Chat', icon: MessageSquare },
    { id: 'payments', label: 'Payment Links', icon: DollarSign },
    { id: 'paid-users', label: 'Paid Users', icon: Users },
    { id: 'schedule', label: 'Scheduling', icon: Calendar },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'recordings', label: 'Recordings', icon: Video },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'support', label: 'Support', icon: LifeBuoy },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'import': return <ImportData />;
      case 'email': return <EmailSender />;
      case 'cta': return <CTAReview />;
      case 'whatsapp': return <WhatsAppPanel />;
      case 'calling': return <AutoCalling />;
      case 'crm': return <CRM />;
      case 'payments': return <PaymentLinks />;
      case 'paid-users': return <PaidUsers />;
      case 'schedule': return <SessionScheduling />;
      case 'assignments': return <AssignmentCreation />;
      case 'recordings': return <RecordingManagement />;
      case 'notifications': return <NotificationsManager />;
      case 'support': return <SupportPanel />;
      case 'certificates': return <CertificateGenerator />;
      case 'settings': return <AdminSettings />;
      default: return <Dashboard />;
    }
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await onSignOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64 group'
          }`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
            <span className={`font-display font-bold text-xl text-primary whitespace-nowrap overflow-hidden transition-all duration-300 ${!sidebarOpen && 'lg:opacity-0 lg:group-hover:opacity-100'}`}>
              Admin Portal
            </span>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    // On mobile close sidebar after click
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${currentView === item.id
                    ? 'bg-blue-50 text-primary font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-dark'
                    }`}
                  title={item.label}
                >
                  <item.icon size={20} className="shrink-0" />
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${signingOut ? 'text-gray-400 cursor-wait' : 'text-red-500 hover:bg-red-50'} transition-colors duration-200`}
            >
              <LogOut size={20} className="shrink-0" />
              <span className={`whitespace-nowrap transition-all duration-300 ${!sidebarOpen && 'lg:opacity-0 lg:group-hover:opacity-100'}`}>
                {signingOut ? 'Signing Out…' : 'Exit Portal'}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <button
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-dark">{displayName}</span>
              <span className="text-xs text-gray-500">{profile?.role === 'admin' ? 'Super Admin' : 'Portal User'}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-gray-300 flex items-center justify-center text-sm font-bold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary>
              {renderContent()}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};
