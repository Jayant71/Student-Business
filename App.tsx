import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Benefits } from './components/Benefits';
import { Testimonials } from './components/Testimonials';
import { EnquiryForm } from './components/EnquiryForm';
import { Footer } from './components/Footer';
import { Signup } from './components/Signup';
import { Signin } from './components/Signin';
import { AdminLayout } from './components/admin/AdminLayout';
import { StudentLayout } from './components/student/StudentLayout';
import { AlertCircle, Loader2 } from 'lucide-react';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Profile } from './types';

type GuestView = 'home' | 'signin' | 'signup';

const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading experience...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center text-dark gap-4">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
    <div>
      <p className="font-semibold">{message}</p>
      <p className="text-sm text-gray-500">Hang tight, we are getting things ready.</p>
    </div>
  </div>
);

const AuthErrorBanner: React.FC<{ message: string; canRetry: boolean; onRetry: () => void | Promise<void> }> = ({ message, canRetry, onRetry }) => (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <AlertCircle size={16} />
      <span>{message}</span>
    </div>
    {canRetry && (
      <button onClick={onRetry} className="text-red-700 font-semibold underline text-xs">Try again</button>
    )}
  </div>
);

const UnknownRoleState: React.FC<{ onSignOut: () => Promise<void> }> = ({ onSignOut }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center text-dark gap-6 p-4">
    <AlertCircle className="h-10 w-10 text-red-500" />
    <div>
      <p className="font-semibold text-lg">We couldn't determine your portal role.</p>
      <p className="text-sm text-gray-500">Please contact support or sign out and try again.</p>
    </div>
    <button onClick={onSignOut} className="px-4 py-2 bg-primary text-white rounded-lg">Sign out</button>
  </div>
);

interface GuestExperienceProps {
  view: GuestView;
  onNavigate: (view: GuestView) => void;
  onRequestRole: (role: 'admin' | 'student') => void;
  intentRole: 'admin' | 'student' | null;
  authError: string | null;
  canRetry: boolean;
  onRetry: () => void;
}

const GuestExperience: React.FC<GuestExperienceProps> = ({ view, onNavigate, onRequestRole, intentRole, authError, canRetry, onRetry }) => {
  if (view === 'signin') {
    return <Signin onNavigate={onNavigate} intentRole={intentRole || undefined} />;
  }

  if (view === 'signup') {
    return <Signup onNavigate={onNavigate} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-dark bg-background selection:bg-primary/20 selection:text-primary">
      <Header
        onNavigate={(next) => {
          onNavigate(next);
          window.scrollTo(0, 0);
        }}
        onRequestRolePortal={(role) => {
          onRequestRole(role);
        }}
      />
      {authError && (
        <AuthErrorBanner
          message={authError}
          canRetry={canRetry}
          onRetry={onRetry}
        />
      )}
      <main className="flex-grow">
        <Hero />
        <Features />
        <Benefits />
        <Testimonials />
        <EnquiryForm />
      </main>
      <Footer />
    </div>
  );
};

const AppRouter = () => {
  const { user, profile, loading, authError, hasError, retryFetchProfile, canRetry, signOut } = useAuth();
  const typedProfile = (profile as Profile | null) ?? null;
  const [guestView, setGuestView] = useState<GuestView>('home');
  const [intentRole, setIntentRole] = useState<'admin' | 'student' | null>(null);

  useEffect(() => {
    if (!user) {
      setGuestView('home');
    }
  }, [user]);

  useEffect(() => {
    if (user && typedProfile) {
      setIntentRole(null);
    }
  }, [user, typedProfile]);

  if (loading) {
    return <LoadingScreen message="Preparing your dashboard" />;
  }

  if (user && typedProfile) {
    if (typedProfile.role === 'admin') {
      return <AdminLayout user={user} profile={typedProfile} onSignOut={signOut} />;
    }

    if (typedProfile.role === 'student') {
      return <StudentLayout user={user} profile={typedProfile} onSignOut={signOut} />;
    }

    return <UnknownRoleState onSignOut={signOut} />;
  }

  return (
    <GuestExperience
      view={guestView}
      onNavigate={setGuestView}
      onRequestRole={(role) => {
        setIntentRole(role);
        setGuestView('signin');
        window.scrollTo(0, 0);
      }}
      intentRole={intentRole}
      authError={hasError ? authError : null}
      canRetry={canRetry}
      onRetry={retryFetchProfile}
    />
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;