import React from 'react';
import { LifeBuoy, MessageSquare, Phone, User } from 'lucide-react';
import { Button } from '../ui/Button';

export const SupportPanel: React.FC = () => {
  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold text-dark">Student Support</h1>

       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row h-[600px]">
           <div className="w-full md:w-80 border-r border-gray-200 flex flex-col">
               <div className="p-4 border-b border-gray-200 bg-gray-50">
                   <div className="flex gap-2">
                       <button className="flex-1 bg-white shadow-sm py-1 px-2 rounded text-xs font-bold text-primary">Open</button>
                       <button className="flex-1 text-gray-500 py-1 px-2 rounded text-xs hover:bg-white/50">Resolved</button>
                   </div>
               </div>
               <div className="overflow-y-auto flex-1">
                   {[1, 2, 3].map(i => (
                       <div key={i} className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${i===1 ? 'bg-blue-50/50' : ''}`}>
                           <div className="flex items-center gap-2 mb-1">
                               <div className="w-2 h-2 rounded-full bg-red-500"></div>
                               <span className="font-bold text-sm text-dark">Issue #{100+i}</span>
                           </div>
                           <p className="text-xs text-gray-600 truncate">Cannot access the assignment portal...</p>
                           <span className="text-[10px] text-gray-400 mt-2 block">2 hours ago • Technical</span>
                       </div>
                   ))}
               </div>
           </div>

           <div className="flex-1 flex flex-col p-6">
               <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                   <div>
                       <h3 className="font-bold text-lg text-dark">Cannot access the assignment portal</h3>
                       <div className="flex items-center gap-2 mt-1">
                           <User size={14} className="text-gray-400"/>
                           <span className="text-sm text-gray-600">Reported by <strong>Sarah J.</strong></span>
                       </div>
                   </div>
                   <Button variant="outline" size="sm">Mark Resolved</Button>
               </div>

               <div className="flex-1 space-y-4">
                   <div className="bg-gray-100 p-4 rounded-lg rounded-tl-none max-w-lg">
                       <p className="text-sm text-gray-800">Hi, I'm trying to upload my homework but the button is greyed out. Please help!</p>
                   </div>
               </div>

               <div className="mt-4 pt-4 border-t border-gray-100">
                   <textarea className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-primary outline-none" rows={3} placeholder="Type your reply..."></textarea>
                   <div className="mt-2 flex justify-end">
                       <Button size="sm">Send Reply</Button>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
};
