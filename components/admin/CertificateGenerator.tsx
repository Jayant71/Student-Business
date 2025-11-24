import React, { useState, useEffect } from 'react';
import { Award, Download, Printer, Check, X, Eye, FileText, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../src/lib/supabase';
import { useToast } from '../../src/context/ToastContext';

interface Student {
    id: string;
    full_name: string;
    email: string;
}

interface Certificate {
    id: string;
    certificate_id: string;
    course_name: string;
    issued_at: string;
    grade?: string;
    file_url: string;
    revoked: boolean;
    profiles: {
        full_name: string;
        email: string;
    };
}

export const CertificateGenerator: React.FC = () => {
    const { showToast } = useToast();
    const [students, setStudents] = useState<Student[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState('');
    const [courseName, setCourseName] = useState('No-Code Entrepreneurship 101');
    const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
    const [grade, setGrade] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadStudents();
        loadCertificates();
    }, []);

    const loadStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('role', 'student')
                .order('full_name');

            if (error) throw error;
            setStudents(data || []);
        } catch (error: any) {
            console.error('Error loading students:', error);
            showToast(error?.message || 'Failed to load students', 'error');
        }
    };

    const loadCertificates = async () => {
        try {
            const { data, error } = await supabase
                .from('certificates')
                .select('id, certificate_id, course_name, issued_at, grade, file_url, revoked, profiles(full_name, email)')
                .order('issued_at', { ascending: false });

            if (error) throw error;
            setCertificates(data || []);
        } catch (error: any) {
            console.error('Error loading certificates:', error);
            showToast(error?.message || 'Failed to load certificates', 'error');
        }
    };

    const handleGenerateCertificate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStudent) {
            showToast('Please select a student', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                showToast('You must be logged in to generate certificates', 'error');
                return;
            }

            const response = await fetch('/api/admin/certificates/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: selectedStudent,
                    course_name: courseName,
                    completion_date: completionDate,
                    grade: grade || undefined,
                    admin_id: user.id
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                showToast('Certificate generated and sent successfully!', 'success');

                // Reset form
                setSelectedStudent('');
                setCourseName('No-Code Entrepreneurship 101');
                setGrade('');

                // Reload certificates
                loadCertificates();
            } else {
                showToast(result.error || 'Failed to generate certificate', 'error');
            }
        } catch (error: any) {
            console.error('Error generating certificate:', error);
            showToast(error?.message || 'Failed to generate certificate', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeCertificate = async (certificateId: string) => {
        if (!confirm('Are you sure you want to revoke this certificate?')) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                showToast('You must be logged in to revoke certificates', 'error');
                return;
            }

            const reason = prompt('Reason for revocation:');

            if (!reason || reason.trim() === '') {
                showToast('Please provide a reason for revocation', 'error');
                return;
            }

            const response = await fetch(`/api/admin/certificates/${certificateId}/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_id: user.id,
                    reason: reason.trim()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                showToast('Certificate revoked successfully', 'success');
                loadCertificates();
            } else {
                showToast(result.error || 'Failed to revoke certificate', 'error');
            }
        } catch (error: any) {
            console.error('Error revoking certificate:', error);
            showToast(error?.message || 'Failed to revoke certificate', 'error');
        }
    };

    const filteredCertificates = certificates.filter(cert =>
        cert.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.certificate_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.course_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-dark">Certificate Generator</h1>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Certificate Generation Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                        <Award className="text-primary" size={20} />
                        Issue Certificate
                    </h3>
                    <form onSubmit={handleGenerateCertificate} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500">Student</label>
                            <select
                                value={selectedStudent}
                                onChange={(e) => setSelectedStudent(e.target.value)}
                                className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
                                required
                            >
                                <option value="">Select Student</option>
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.full_name} ({student.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500">Course Name</label>
                            <input
                                type="text"
                                value={courseName}
                                onChange={(e) => setCourseName(e.target.value)}
                                className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
                                placeholder="Enter course name"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500">Completion Date</label>
                            <input
                                type="date"
                                value={completionDate}
                                onChange={(e) => setCompletionDate(e.target.value)}
                                className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500">Grade (Optional)</label>
                            <input
                                type="text"
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm"
                                placeholder="e.g., A+, 95%, Distinction"
                            />
                        </div>

                        <Button
                            type="submit"
                            fullWidth
                            className="gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Award size={16} /> Generate & Send Certificate
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                {/* Certificate Preview */}
                <div className="bg-gray-100 p-8 rounded-xl flex items-center justify-center border border-gray-200">
                    <div className="bg-white w-full aspect-[4/3] shadow-lg p-6 relative border-4 border-double border-gray-300 text-center flex flex-col justify-center items-center">
                        <div className="text-4xl mb-2">🎓</div>
                        <h2 className="font-serif text-2xl font-bold text-dark mb-2">
                            Certificate of Completion
                        </h2>
                        <p className="text-xs text-gray-500">This certifies that</p>
                        <h3 className="font-display text-xl font-bold text-primary my-2 italic">
                            {selectedStudent
                                ? students.find(s => s.id === selectedStudent)?.full_name || 'Student Name'
                                : 'Student Name'}
                        </h3>
                        <p className="text-xs text-gray-500">Has successfully completed the course</p>
                        <p className="font-bold text-sm my-1">{courseName}</p>
                        {grade && (
                            <p className="text-sm text-gray-600 mt-2">Grade: {grade}</p>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-200 w-2/3 mx-auto flex justify-between text-[10px] text-gray-400">
                            <span>Date: {completionDate}</span>
                            <span>Futura Learning</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Issued Certificates List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-dark flex items-center gap-2">
                        <FileText size={20} />
                        Issued Certificates ({certificates.length})
                    </h3>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search certificates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 text-left text-xs font-bold text-gray-500">
                                <th className="pb-3">Certificate ID</th>
                                <th className="pb-3">Student</th>
                                <th className="pb-3">Course</th>
                                <th className="pb-3">Grade</th>
                                <th className="pb-3">Issued Date</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredCertificates.map((cert) => (
                                <tr key={cert.id} className="border-b border-gray-100">
                                    <td className="py-3">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            {cert.certificate_id}
                                        </code>
                                    </td>
                                    <td className="py-3">
                                        <div>
                                            <div className="font-medium">{cert.profiles?.full_name || 'Unknown Student'}</div>
                                            <div className="text-xs text-gray-500">{cert.profiles?.email || 'No email'}</div>
                                        </div>
                                    </td>
                                    <td className="py-3">{cert.course_name}</td>
                                    <td className="py-3">
                                        {cert.grade ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                                {cert.grade}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="py-3">
                                        {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="py-3">
                                        {cert.revoked ? (
                                            <span className="flex items-center gap-1 text-red-600 text-xs">
                                                <X size={14} /> Revoked
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-green-600 text-xs">
                                                <Check size={14} /> Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3">
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => cert.file_url && window.open(cert.file_url, '_blank')}
                                                className="gap-1"
                                                disabled={!cert.file_url}
                                            >
                                                <Eye size={14} /> View
                                            </Button>

                                            {!cert.revoked && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRevokeCertificate(cert.certificate_id)}
                                                    className="gap-1 text-red-600 hover:bg-red-50"
                                                >
                                                    <X size={14} /> Revoke
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredCertificates.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-gray-500">
                                        {searchTerm ? 'No certificates found matching your search' : 'No certificates issued yet'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
