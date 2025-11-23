import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';

export const ImportData: React.FC = () => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-dark">Import Student Data</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={step >= 1 ? "text-primary font-bold" : ""}>1. Upload</span>
            <span className="text-gray-300">→</span>
            <span className={step >= 2 ? "text-primary font-bold" : ""}>2. Validate</span>
            <span className="text-gray-300">→</span>
            <span className={step >= 3 ? "text-primary font-bold" : ""}>3. Finish</span>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white p-12 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-4">
                <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-dark mb-2">Click to upload or drag and drop</h3>
            <p className="text-gray-500 text-sm mb-6">CSV, Excel files (max 10MB)</p>
            <Button onClick={() => { setFile(new File([""], "students.csv")); setStep(2); }}>Select File</Button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                    <FileText className="text-primary" size={20} />
                    <span className="font-medium">students_batch_2024.csv</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep(1)}><X size={16} /></Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Phone</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr>
                            <td className="px-6 py-3"><span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium"><CheckCircle size={12}/> Valid</span></td>
                            <td className="px-6 py-3">John Doe</td>
                            <td className="px-6 py-3">john@example.com</td>
                            <td className="px-6 py-3">+1 555 123 4567</td>
                        </tr>
                        <tr>
                             <td className="px-6 py-3"><span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium"><AlertCircle size={12}/> Error</span></td>
                            <td className="px-6 py-3">Jane Smith</td>
                            <td className="px-6 py-3 text-red-500">invalid-email</td>
                            <td className="px-6 py-3">+1 555 987 6543</td>
                        </tr>
                        {[1,2,3].map(i => (
                             <tr key={i}>
                                <td className="px-6 py-3"><span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium"><CheckCircle size={12}/> Valid</span></td>
                                <td className="px-6 py-3">Student {i}</td>
                                <td className="px-6 py-3">student{i}@test.com</td>
                                <td className="px-6 py-3">+1 555 000 000{i}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Cancel</Button>
                <Button onClick={() => setStep(3)}>Import 4 Rows</Button>
            </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
             <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-success mb-4 mx-auto">
                <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-dark mb-2">Import Successful!</h3>
            <p className="text-gray-500 mb-6">4 new leads have been added to your database.</p>
            <Button onClick={() => setStep(1)}>Import More</Button>
        </div>
      )}
    </div>
  );
};
