import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from './ui/Button';
import { Send, Clock, User, Phone, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { useToast } from '@/src/context/ToastContext';

type Inputs = {
  fullName: string;
  age: number;
  email: string;
  mobile: string;
  timeSlot: 'weekday-pm' | 'weekend-am' | 'weekend-pm';
  message: string;
};

export const EnquiryForm: React.FC = () => {
  const toast = useToast();
  const [lastSubmittedSlot, setLastSubmittedSlot] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<Inputs>({
    defaultValues: {
      timeSlot: 'weekday-pm'
    }
  });

  const timeSlotLabels = useMemo(() => ({
    'weekday-pm': 'Weekdays (4 PM - 6 PM)',
    'weekend-am': 'Weekends (10 AM - 12 PM)',
    'weekend-pm': 'Weekends (2 PM - 4 PM)'
  }), []);

  const onSubmit = async (data: Inputs) => {
    const normalizedPhone = data.mobile.replace(/[^+\d]/g, '');
    const phoneValue = normalizedPhone || data.mobile.trim();

    try {
      const payload = {
        name: data.fullName.trim(),
        age: Number.isFinite(data.age) ? data.age : null,
        email: data.email.trim().toLowerCase(),
        phone: phoneValue,
        message: data.message?.trim() || null,
        preferred_time_slot: data.timeSlot,
        source: 'landing-page'
      };

      const { error } = await supabase.from('cta_submissions').insert(payload);
      if (error) throw error;

      toast.showSuccess('Thanks! Our team will reach out shortly.');
      setLastSubmittedSlot(timeSlotLabels[data.timeSlot]);
      reset();
    } catch (err: any) {
      console.error('CTA submission failed', err);
      toast.showError('Unable to submit enquiry', err.message || 'Please try again in a moment.');
    }
  };

  return (
    <section id="enquiry" className="py-24 bg-dark relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

          {/* Form Side */}
          <div className="flex-1 p-8 md:p-12">
            <h2 className="font-display font-bold text-3xl text-dark mb-2">Start Your Journey</h2>
            <p className="text-gray-500 mb-8 text-sm">Fill out the form below to book your spot. No charges until the first class.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      {...register("fullName", { required: true })}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.fullName && <span className="text-xs text-danger">Required</span>}
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Student Age</label>
                  <input
                    type="number"
                    {...register("age", { required: true, min: 10, max: 20, valueAsNumber: true })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="12-18"
                  />
                  {errors.age && <span className="text-xs text-danger">Age 12-18 preferred</span>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="email"
                    {...register("email", { required: true })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="student@example.com"
                  />
                </div>
                {errors.email && <span className="text-xs text-danger">Required</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="tel"
                    {...register("mobile", { required: true })}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                {errors.mobile && <span className="text-xs text-danger">Required</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Preferred Time Slot</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 text-gray-400" size={18} />
                  <select
                    {...register("timeSlot")}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none text-gray-600"
                  >
                    <option value="weekday-pm">Weekdays (4 PM - 6 PM)</option>
                    <option value="weekend-am">Weekends (10 AM - 12 PM)</option>
                    <option value="weekend-pm">Weekends (2 PM - 4 PM)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">What do you want to build?</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-gray-400" size={18} />
                  <textarea
                    {...register("message")}
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    placeholder="I want to build an app for..."
                  ></textarea>
                </div>
              </div>

              <Button
                variant="accent"
                fullWidth
                size="lg"
                className="mt-4 group"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Sending...' : 'Submit Enquiry'}</span>
                {isSubmitting ? (
                  <Loader2 size={18} className="ml-2 animate-spin" />
                ) : (
                  <Send size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                )}
              </Button>

              {lastSubmittedSlot && (
                <p className="text-xs text-green-600 text-center">
                  Preference saved for {lastSubmittedSlot}. We will confirm availability soon.
                </p>
              )}

            </form>
          </div>

          {/* Info Side (Hidden on Mobile) */}
          <div className="hidden md:flex flex-col justify-between w-80 bg-gradient-to-br from-primary to-blue-600 p-8 text-white relative overflow-hidden">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-2xl mb-4">Why Join Now?</h3>
                <ul className="space-y-4 text-blue-100 text-sm">
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2"></span>
                    Limited seats per batch
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2"></span>
                    Free 1-on-1 consultation
                  </li>
                  <li className="flex gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-2"></span>
                    Access to premium AI tools
                  </li>
                </ul>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                <p className="font-semibold text-accent text-lg mb-1">Quick Response</p>
                <p className="text-xs opacity-80">We usually reply within 24 hours.</p>
              </div>
            </div>

            {/* Decor */}
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-secondary rounded-full blur-[60px] opacity-60"></div>
          </div>

        </div>
      </div>
    </section>
  );
};