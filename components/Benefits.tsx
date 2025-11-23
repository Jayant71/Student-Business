import React from 'react';
import { CheckCircle2, Video, MessageCircle, Clock, Award, ShieldCheck } from 'lucide-react';

export const Benefits: React.FC = () => {
  const benefitList = [
    { text: "Recorded Lectures Dashboard", icon: Video },
    { text: "Class Links via WhatsApp", icon: MessageCircle },
    { text: "Flexible Time Slots", icon: Clock },
    { text: "Official Certificate", icon: Award },
    { text: "Fast Mentor Support", icon: ShieldCheck },
    { text: "Practical Assignments", icon: CheckCircle2 },
  ];

  return (
    <section id="benefits" className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          
          <div className="flex-1 order-2 lg:order-1">
             <div className="relative">
                <div className="absolute inset-0 bg-secondary/10 transform rotate-3 rounded-3xl"></div>
                <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                    <h3 className="font-display font-bold text-2xl mb-8 border-b pb-4">Why Parents & Students Love Us</h3>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {benefitList.map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="mt-1 p-1 bg-green-100 rounded-full text-green-600 shrink-0">
                                    <item.icon size={18} />
                                </div>
                                <span className="font-medium text-gray-700">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
             </div>
          </div>

          <div className="flex-1 order-1 lg:order-2">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-dark mb-6">
              Everything You Need to <span className="text-secondary">Succeed</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              We know school life is busy. That's why our program is designed to be flexible, accessible, and supportive. No stress, just pure learning and creating.
            </p>
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-primary mb-2">Did you know?</h4>
                <p className="text-sm text-gray-700">
                    72% of high school students want to start their own business. We give them the toolkit to actually do it using modern AI.
                </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};