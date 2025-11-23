import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';
import { errorLogger } from '../services/error-logger';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: any | null;
    loading: boolean;
    authError: string | null;
    signOut: () => Promise<void>;
    retryFetchProfile: () => Promise<void>;
    retryCount: number;
    hasError: boolean;
    canRetry: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    
    const toast = useToast();

    const logError = useCallback(async (error: Error, context: string) => {
        await errorLogger.logErrorAuto(error, {
            type: 'api-error',
            severity: 'high',
            context: {
                component: 'AuthContext',
                operation: context,
                userId: user?.id,
                retryCount
            }
        });
    }, [user?.id, retryCount]);

    const fetchProfile = useCallback(async (userId: string, isRetry: boolean = false) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                throw error;
            }
            
            setProfile(data);
            setAuthError(null);
            
            if (isRetry) {
                toast.showSuccess('Profile loaded successfully');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch profile';
            setAuthError(errorMessage);
            
            await logError(error as Error, 'fetchProfile');
            
            if (!isRetry) {
                toast.showError('Profile loading failed', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    }, [toast, logError]);

    const retryFetchProfile = useCallback(async () => {
        if (user) {
            setRetryCount(prev => prev + 1);
            setLoading(true);
            await fetchProfile(user.id, true);
        }
    }, [user, fetchProfile]);

    useEffect(() => {
        // Get initial session
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    throw error;
                }
                
                setSession(session);
                setUser(session?.user ?? null);
                
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                const errorMessage = error instanceof Error ? error.message : 'Failed to initialize authentication';
                setAuthError(errorMessage);
                
                await logError(error as Error, 'initializeAuth');
                toast.showError('Authentication failed', errorMessage);
                setLoading(false);
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setAuthError(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchProfile, logError, toast]);

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            toast.showSuccess('Signed out successfully');
        } catch (error) {
            console.error('Error signing out:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
            toast.showError('Sign out failed', errorMessage);
            await logError(error as Error, 'signOut');
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            profile,
            loading,
            authError,
            signOut,
            retryFetchProfile,
            retryCount,
            hasError: !!authError,
            canRetry: retryCount < 3
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
