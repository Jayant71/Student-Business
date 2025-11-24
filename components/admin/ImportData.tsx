import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import Papa from 'papaparse';
import { useToast } from '../../src/context/ToastContext';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

interface LeadRow {
    name: string;
    email: string;
    phone: string;
    source?: string;
    status: 'valid' | 'error';
    errorMessage?: string;
}

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\+\(\)]{8,20}$/;
    return phoneRegex.test(phone);
};

export const ImportData: React.FC = () => {
    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedLeads, setParsedLeads] = useState<LeadRow[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();
    const { user } = useAuth();

    const handleFileSelect = (selectedFile: File) => {
        if (!selectedFile) return;

        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.showError('File too large', 'Maximum file size is 10MB');
            return;
        }

        setFile(selectedFile);

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const leads: LeadRow[] = results.data.map((row: any) => {
                    const name = row.name || row.Name || '';
                    const email = row.email || row.Email || '';
                    const phone = row.phone || row.Phone || row.phone_number || row['Phone Number'] || '';
                    const source = row.source || row.Source || 'import';

                    let status: 'valid' | 'error' = 'valid';
                    let errorMessage = '';

                    if (!name || name.trim().length < 2) {
                        status = 'error';
                        errorMessage = 'Invalid name';
                    } else if (!email || !validateEmail(email)) {
                        status = 'error';
                        errorMessage = 'Invalid email';
                    } else if (!phone || !validatePhone(phone)) {
                        status = 'error';
                        errorMessage = 'Invalid phone';
                    }

                    return { name, email, phone, source, status, errorMessage };
                });

                setParsedLeads(leads);
                setStep(2);
            },
            error: (error) => {
                toast.showError('Parse error', error.message);
                setFile(null);
            }
        });
    };

    const handleImport = async () => {
        if (!user) {
            toast.showError('Not authenticated', 'Please sign in to import leads');
            return;
        }

        setImporting(true);

        try {
            const validLeads = parsedLeads.filter(lead => lead.status === 'valid');

            if (validLeads.length === 0) {
                toast.showError('No valid leads', 'Please fix the validation errors first');
                setImporting(false);
                return;
            }

            // Insert leads into Supabase
            const leadsToInsert = validLeads.map(lead => ({
                admin_id: user.id,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                source: lead.source || 'import',
                status: 'pending'
            }));

            const { data, error } = await supabase
                .from('imported_leads')
                .insert(leadsToInsert)
                .select();

            if (error) throw error;

            const successCount = data?.length || 0;
            const failedCount = parsedLeads.length - successCount;

            setImportResult({ success: successCount, failed: failedCount });
            setStep(3);
            toast.showSuccess('Import complete', `${successCount} leads imported successfully`);

        } catch (error: any) {
            console.error('Import error:', error);
            toast.showError('Import failed', error.message || 'Failed to import leads');
        } finally {
            setImporting(false);
        }
    };

    const validLeadsCount = parsedLeads.filter(lead => lead.status === 'valid').length;
    const errorLeadsCount = parsedLeads.filter(lead => lead.status === 'error').length;

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
                <div
                    className="bg-white p-12 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-4">
                        <Upload size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-dark mb-2">Click to upload or drag and drop</h3>
                    <p className="text-gray-500 text-sm mb-6">CSV files (max 10MB)</p>
                    <p className="text-xs text-gray-400">Required columns: name, email, phone</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                </div>
            )}

            {step === 2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                        <div className="flex items-center gap-3">
                            <FileText className="text-primary" size={20} />
                            <span className="font-medium">{file?.name}</span>
                            <span className="text-sm text-gray-500">
                                ({validLeadsCount} valid, {errorLeadsCount} errors)
                            </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setStep(1); setFile(null); setParsedLeads([]); }}>
                            <X size={16} />
                        </Button>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Phone</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parsedLeads.map((lead, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-3">
                                            {lead.status === 'valid' ? (
                                                <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                                                    <CheckCircle size={12} /> Valid
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium" title={lead.errorMessage}>
                                                    <AlertCircle size={12} /> Error
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">{lead.name || '-'}</td>
                                        <td className={`px-6 py-3 ${lead.status === 'error' && lead.errorMessage?.includes('email') ? 'text-red-500' : ''}`}>
                                            {lead.email || '-'}
                                        </td>
                                        <td className={`px-6 py-3 ${lead.status === 'error' && lead.errorMessage?.includes('phone') ? 'text-red-500' : ''}`}>
                                            {lead.phone || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => { setStep(1); setFile(null); setParsedLeads([]); }}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={validLeadsCount === 0 || importing}
                        >
                            {importing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Importing...
                                </>
                            ) : (
                                `Import ${validLeadsCount} ${validLeadsCount === 1 ? 'Lead' : 'Leads'}`
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-success mb-4 mx-auto">
                        <CheckCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-dark mb-2">Import Successful!</h3>
                    <p className="text-gray-500 mb-6">
                        {importResult?.success} {importResult?.success === 1 ? 'lead has' : 'leads have'} been added to your database.
                        {importResult && importResult.failed > 0 && (
                            <span className="text-red-500 block mt-1">
                                {importResult.failed} {importResult.failed === 1 ? 'row' : 'rows'} failed validation.
                            </span>
                        )}
                    </p>
                    <Button onClick={() => { setStep(1); setFile(null); setParsedLeads([]); setImportResult(null); }}>
                        Import More
                    </Button>
                </div>
            )}
        </div>
    );
};
