import React from 'react';
import { Award, Download, Printer } from 'lucide-react';
import { Button } from '../ui/Button';

export const CertificateGenerator: React.FC = () => {
  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark">Certificate Generator</h1>

        <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-dark mb-4">Issue Certificate</h3>
                <form className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500">Student Name</label>
                        <input type="text" className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm" placeholder="Full Name" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">Course Name</label>
                        <input type="text" className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm" defaultValue="No-Code Entrepreneurship 101" />
                    </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500">Completion Date</label>
                        <input type="date" className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm" />
                    </div>
                    <Button fullWidth className="gap-2"><Award size={16}/> Generate & Send</Button>
                </form>
            </div>

            <div className="bg-gray-100 p-8 rounded-xl flex items-center justify-center border border-gray-200">
                 {/* CSS Certificate Preview */}
                <div className="bg-white w-full aspect-[4/3] shadow-lg p-6 relative border-4 border-double border-gray-300 text-center flex flex-col justify-center items-center">
                    <h2 className="font-serif text-2xl font-bold text-dark mb-2">Certificate of Completion</h2>
                    <p className="text-xs text-gray-500">This certifies that</p>
                    <h3 className="font-display text-xl font-bold text-primary my-2 italic">Student Name</h3>
                    <p className="text-xs text-gray-500">Has successfully completed the course</p>
                    <p className="font-bold text-sm my-1">No-Code Entrepreneurship</p>
                    <div className="mt-4 pt-4 border-t border-gray-200 w-2/3 mx-auto flex justify-between text-[10px] text-gray-400">
                        <span>Date: 2024-10-24</span>
                        <span>Signature: Alex R.</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
