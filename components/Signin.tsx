import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from './ui/Button';
import { Mail, Lock, ArrowLeft, Rocket } from 'lucide-react';

import { supabase } from '../src/lib/supabase';
import { useToast } from '../src/context/ToastContext';

interface SigninProps {
  onNavigate: (view: 'home' | 'signin' | 'signup') => void;
  intentRole?: 'admin' | 'student';
}

export const Signin: React.FC<SigninProps> = ({ onNavigate, intentRole }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = React.useState(false);
  const toast = useToast();

  const heading = intentRole === 'admin' ? 'Welcome back, Admin' : 'Welcome Back!';
  const subheading = intentRole === 'admin'
    ? 'Use your admin credentials to access the control room.'
    : 'Please enter your details to sign in.';
  const intentLabel = intentRole ? `${intentRole === 'admin' ? 'Admin' : 'Student'} mode` : null;

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      toast.showSuccess('Signed in successfully');
      onNavigate('home');
    } catch (error: any) {
      toast.showError('Sign in failed', error.message || 'Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative">
      {/* Subtle Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#3A7DFF 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <button
        onClick={() => onNavigate('home')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-primary transition-colors z-20"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back to Home</span>
      </button>

      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row z-10">

        {/* Form Side */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-center order-2 md:order-1">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <h1 className="font-display font-bold text-3xl text-dark mb-2">{heading}</h1>
                {intentLabel && (
                  <span className="text-xs font-semibold uppercase bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {intentLabel}
                  </span>
                )}
              </div>
              <p className="text-gray-500">{subheading}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="email"
                    {...register("email", { required: true })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-dark font-medium"
                    placeholder="student@example.com"
                  />
                </div>
                {errors.email && <span className="text-xs text-danger ml-1">Required</span>}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                  <a href="#" className="text-xs font-semibold text-primary hover:underline">Forgot password?</a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="password"
                    {...register("password", { required: true })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-dark font-medium"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <span className="text-xs text-danger ml-1">Required</span>}
              </div>

              <Button variant="primary" fullWidth size="lg" className="rounded-xl mt-4" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <button onClick={() => onNavigate('signup')} className="text-primary font-bold hover:underline">
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Visual Side */}
        <div className="flex-1 bg-gradient-to-br from-dark to-black text-white p-12 flex flex-col justify-center items-center text-center relative overflow-hidden order-1 md:order-2">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[80px] opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary rounded-full blur-[80px] opacity-30"></div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
              <Rocket className="text-accent" size={32} />
            </div>
            <h3 className="font-display font-bold text-2xl mb-4">Continue Your Streak</h3>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
              "The best way to predict the future is to create it." <br />— Peter Drucker
            </p>

            <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-xs mx-auto opacity-50 pointer-events-none">
              <div className="h-2 bg-white/20 rounded-full w-full"></div>
              <div className="h-2 bg-white/20 rounded-full w-2/3"></div>
              <div className="h-2 bg-white/20 rounded-full w-3/4"></div>
              <div className="h-2 bg-white/20 rounded-full w-full"></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};