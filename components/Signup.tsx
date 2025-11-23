import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from './ui/Button';
import { User, Mail, Phone, Lock, ArrowLeft, Sparkles } from 'lucide-react';

import { supabase } from '../src/lib/supabase';
import { useToast } from '../src/context/ToastContext';

interface SignupProps {
  onNavigate: (view: 'home' | 'signin' | 'signup') => void;
}

export const Signup: React.FC<SignupProps> = ({ onNavigate }) => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const password = watch("password");
  const [loading, setLoading] = React.useState(false);
  const toast = useToast();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create profile via RPC
        const { error: profileError } = await supabase.rpc('create_profile_for_current_user', {
          p_name: data.fullName,
          p_phone: data.phone,
          p_role: 'student' // Default role
        });

        if (profileError) {
          console.error("Profile creation failed:", profileError);
          // Optional: Handle cleanup or manual profile creation retry
        }

        toast.showSuccess('Account created', 'Check your inbox for confirmation then sign in.');
        onNavigate('signin');
      }
    } catch (error: any) {
      toast.showError('Signup failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50"></div>

      <button
        onClick={() => onNavigate('home')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-primary transition-colors z-20 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back to Home</span>
      </button>

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 border border-white/50">

        {/* Illustration Side */}
        <div className="hidden md:flex flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 items-center justify-center p-12 relative overflow-hidden">
          <div className="relative z-10 text-center">
            <div className="relative inline-block mb-8 group">
              <div className="absolute inset-0 bg-accent blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <img
                src="https://picsum.photos/seed/techstudent/600/600"
                alt="Student Learning"
                className="relative w-64 h-64 object-cover rounded-2xl shadow-lg transform rotate-3 transition-transform duration-500 group-hover:rotate-0 group-hover:scale-105"
              />
              <div className="absolute -bottom-4 -right-4 bg-white p-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce duration-1000">
                <Sparkles className="text-accent fill-current" size={20} />
                <span className="font-bold text-xs text-dark">AI Powered</span>
              </div>
            </div>

            <h2 className="font-display font-bold text-2xl text-dark mb-3">Build Your Future</h2>
            <p className="text-gray-600 max-w-xs mx-auto text-sm leading-relaxed">
              Join thousands of young creators mastering no-code tools and launching real businesses.
            </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="flex-1 p-8 md:p-12 overflow-y-auto max-h-[90vh]">
          <div className="max-w-md mx-auto">
            <div className="mb-8">
              <h1 className="font-display font-bold text-3xl text-dark mb-2">Create Account</h1>
              <p className="text-secondary font-medium">Begin your learning journey.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    {...register("fullName", { required: true })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-dark font-medium placeholder:text-gray-400"
                    placeholder="Jane Doe"
                  />
                </div>
                {errors.fullName && <span className="text-xs text-danger ml-1">Required</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="email"
                    {...register("email", { required: true })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-dark font-medium placeholder:text-gray-400"
                    placeholder="student@example.com"
                  />
                </div>
                {errors.email && <span className="text-xs text-danger ml-1">Required</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Phone / WhatsApp</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="tel"
                    {...register("phone", { required: true })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-dark font-medium placeholder:text-gray-400"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                {errors.phone && <span className="text-xs text-danger ml-1">Required</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="password"
                    {...register("password", { required: "Required", minLength: { value: 6, message: "Min 6 chars" } })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-dark font-medium placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <span className="text-xs text-danger ml-1">{errors.password.message as string}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    type="password"
                    {...register("confirmPassword", {
                      required: true,
                      validate: (val) => val === password || "Passwords do not match"
                    })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all text-dark font-medium placeholder:text-gray-400"
                    placeholder="••••••••"
                  />
                </div>
                {errors.confirmPassword && <span className="text-xs text-danger ml-1">{errors.confirmPassword.message as string}</span>}
              </div>

              <div className="pt-2">
                <Button variant="primary" fullWidth size="lg" className="rounded-xl shadow-xl shadow-primary/20 hover:shadow-primary/40" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>

            </form>

            <p className="mt-8 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button onClick={() => onNavigate('signin')} className="text-primary font-bold hover:underline">
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};