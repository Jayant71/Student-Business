import React from 'react';
import { Phone, Play, Pause, RotateCw, Mic } from 'lucide-react';
import { Button } from '../ui/Button';

export const AutoCalling: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
          <Phone className="text-secondary" /> Auto Calling Panel
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <h3 className="text-gray-500 text-sm mb-1">Queue Status</h3>
              <p className="text-3xl font-bold text-primary">124 <span className="text-sm font-normal text-gray-400">pending</span></p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <h3 className="text-gray-500 text-sm mb-1">Success Rate</h3>
              <p className="text-3xl font-bold text-success">68% <span className="text-sm font-normal text-gray-400">connected</span></p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center gap-4">
               <Button variant="primary" className="rounded-full w-12 h-12 p-0 flex items-center justify-center"><Play size={20}/></Button>
               <Button variant="outline" className="rounded-full w-12 h-12 p-0 flex items-center justify-center border-gray-300 text-gray-500"><Pause size={20}/></Button>
          </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-[500px]">
          {/* Call Queue */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 font-bold text-gray-700">Live Call Queue</div>
              <div className="overflow-y-auto flex-1 p-0">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                          <tr>
                              <th className="px-4 py-2">Name</th>
                              <th className="px-4 py-2">Number</th>
                              <th className="px-4 py-2">Status</th>
                              <th className="px-4 py-2">Attempts</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {[1,2,3,4,5].map(i => (
                              <tr key={i}>
                                  <td className="px-4 py-3 font-medium">Lead #{i}</td>
                                  <td className="px-4 py-3">+1 555 010 {i}</td>
                                  <td className="px-4 py-3">
                                      {i === 1 ? <span className="text-green-600 flex items-center gap-1"><Mic size={12} className="animate-pulse"/> On Call</span> : 
                                       i === 2 ? <span className="text-red-500">Failed</span> :
                                       <span className="text-gray-400">Queued</span>}
                                  </td>
                                  <td className="px-4 py-3">{i === 2 ? 3 : 0}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Script Viewer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 font-bold text-gray-700 bg-yellow-50">AI Script Assistant</div>
              <div className="p-6 overflow-y-auto font-mono text-sm leading-relaxed text-gray-700">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Greeting</p>
                  <p className="mb-4">"Hi, am I speaking with [Name]? This is Alex from Future Founders Academy."</p>
                  
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Value Prop</p>
                  <p className="mb-4">"I saw you were interested in building apps. We have a new batch starting this weekend. Do you have 2 minutes to hear about it?"</p>

                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Objection Handling: "Busy"</p>
                  <p className="mb-4 text-blue-600">"No problem. Is there a better time to call back? Or should I send you a WhatsApp with the details?"</p>
              </div>
          </div>
      </div>
    </div>
  );
};
