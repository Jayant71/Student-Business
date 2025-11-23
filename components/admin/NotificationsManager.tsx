import React from 'react';
import { Bell, Clock, Send } from 'lucide-react';
import { Button } from '../ui/Button';

export const NotificationsManager: React.FC = () => {
  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark">Automated Notifications</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                <Clock size={18} className="text-primary"/> 15-Minute Reminder
            </h3>
            <p className="text-sm text-gray-500 mb-6">Automatically sent 15 minutes before every scheduled session.</p>

            <div className="grid md:grid-cols-2 gap-8">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Email Template</label>
                    <textarea 
                        className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-primary transition-colors outline-none"
                        defaultValue="Hi {{name}}, Class is starting in 15 minutes! Join here: {{link}}" 
                    />
                </div>
                 <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">WhatsApp Template</label>
                    <textarea 
                        className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-primary transition-colors outline-none"
                        defaultValue="🚀 Ready? Class starts in 15 mins! Click to join: {{link}}" 
                    />
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline">Test Send</Button>
                <Button>Save Settings</Button>
            </div>
        </div>
    </div>
  );
};
