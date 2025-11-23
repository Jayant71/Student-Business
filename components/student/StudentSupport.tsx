import React from 'react';
import { LifeBuoy, MessageCircle, Phone, Mail, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export const StudentSupport: React.FC = () => {
  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
           <LifeBuoy className="text-primary" /> Help & Support
       </h1>
        <p className="text-gray-500">Stuck on a project? Need help with your account? We're here for you.</p>

        <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-primary transition-colors group cursor-pointer text-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-[#25D366] mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <MessageCircle size={28} />
                </div>
                <h3 className="font-bold text-dark text-lg mb-2">WhatsApp Chat</h3>
                <p className="text-sm text-gray-500 mb-6">Fastest response. Chat directly with your mentor.</p>
                <Button variant="outline" fullWidth className="text-[#25D366] border-[#25D366] hover:bg-green-50">Chat Now</Button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-primary transition-colors group cursor-pointer text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-primary mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Mail size={28} />
                </div>
                <h3 className="font-bold text-dark text-lg mb-2">Email Support</h3>
                <p className="text-sm text-gray-500 mb-6">For detailed questions or submitting large files.</p>
                <Button variant="outline" fullWidth className="text-primary border-primary hover:bg-blue-50">Send Email</Button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-primary transition-colors group cursor-pointer text-center">
                <div className="w-14 h-14 bg-purple-50 rounded-full flex items-center justify-center text-secondary mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Phone size={28} />
                </div>
                <h3 className="font-bold text-dark text-lg mb-2">Schedule Call</h3>
                <p className="text-sm text-gray-500 mb-6">Book a 15-min 1:1 session for project help.</p>
                <Button variant="outline" fullWidth className="text-secondary border-secondary hover:bg-purple-50">Book Slot</Button>
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 mt-8">
            <h3 className="font-bold text-dark text-lg mb-6 flex items-center gap-2"><HelpCircle size={20}/> Frequently Asked Questions</h3>
            <div className="space-y-4">
                {[
                    "How do I submit my assignment?",
                    "Where can I find the Zoom link?",
                    "Can I change my batch timing?",
                    "How long do I have access to recordings?"
                ].map((q, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer">
                        <span className="font-medium text-gray-700">{q}</span>
                        <ChevronRight size={18} className="text-gray-400" />
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};