import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Filter, Send, Clock, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { emailService, EmailRequest, EmailTemplate, EmailStats } from '../../src/services';
import { supabase } from '../../src/lib/supabase';
import { useToast } from '../../src/context/ToastContext';

interface Recipient {
  id: string;
  name: string;
  email: string;
  status: string;
}

export const EmailSender: React.FC = () => {
  const toast = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('Welcome Email');
  const [subject, setSubject] = useState('Welcome to Future Founders! 🚀');
  const [content, setContent] = useState('Hi {{name}},\n\nWe are thrilled to have you interested in the <strong>No-Code Future Academy</strong>.\n\nIn this course, you will learn how to build apps, websites, and automations without writing code.\n\n<br/>\nBest,<br/>Alex Rivera');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    loadStats();
    loadRecipients();
  }, []);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const formattedRecipients: Recipient[] = (data || []).map((profile) => ({
        id: profile.id,
        name: profile.name || profile.email.split('@')[0] || 'Student',
        email: profile.email,
        status: 'Pending',
      }));

      setRecipients(formattedRecipients);
    } catch (err: any) {
      console.error('Failed to load recipients:', err);
      toast?.showError('Failed to load recipients', err.message || 'Unable to fetch student list');
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, [toast]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await emailService.getTemplates();
      if (response.data) {
        setTemplates(response.data);
      }
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await emailService.getStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
    const template = templates.find(t => t.name === templateName);
    if (template) {
      setSubject(template.subject);
      setContent(template.content);
    }
  };

  const handleSendBatch = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const emailRequests: EmailRequest[] = recipients
        .filter(r => r.status === 'Pending')
        .map(recipient => ({
          to_email: recipient.email,
          subject,
          content: content
            .replace('{{name}}', recipient.name.split(' ')[0])
            .replace('{{email}}', recipient.email),
          template_name: selectedTemplate,
          template_params: { name: recipient.name.split(' ')[0], email: recipient.email }
        }));

      const response = await emailService.sendBatchEmail({
        emails: emailRequests,
        template_name: selectedTemplate
      });

      if (response.data) {
        setSuccess(`Successfully sent ${response.data.sent_count} emails`);
        // Update recipient statuses
        const updatedRecipients = recipients.map(r =>
          r.status === 'Pending' ? { ...r, status: 'Sent' } : r
        );
        setRecipients(updatedRecipients);
        loadStats();
      }
    } catch (err) {
      setError('Failed to send emails. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">Email Batch Sender</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loadingRecipients ? 'Loading recipients...' : `${recipients.length} students available`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={loadRecipients}
            disabled={loadingRecipients}
          >
            {loadingRecipients ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </Button>
          <Button
            variant="accent"
            className="gap-2"
            onClick={handleSendBatch}
            disabled={sending || loadingRecipients || recipients.filter(r => r.status === 'Pending').length === 0}
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Send Batch
          </Button>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-500" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* List Section */}
        <div className="w-1/3 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex gap-2">
            <div className="relative flex-1">
              <Filter size={16} className="absolute left-3 top-3 text-gray-400" />
              <select className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary">
                <option>Status: Pending</option>
                <option>Status: Sent</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingRecipients ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-gray-400" size={32} />
              </div>
            ) : recipients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                <Mail size={48} className="mb-3 opacity-50" />
                <p className="text-sm">No students found</p>
                <p className="text-xs mt-1">Add students to send emails</p>
              </div>
            ) : (
              recipients.map((recipient, index) => (
                <div key={recipient.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${index === 0 ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm text-dark">{recipient.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${recipient.status === 'Sent'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                      {recipient.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{recipient.email}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor Section */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 uppercase">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-200 rounded-lg font-medium text-dark focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Template</label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {['Welcome Email', 'Payment Reminder', 'Class Link'].map((template) => (
                  <span
                    key={template}
                    onClick={() => handleTemplateSelect(template)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${selectedTemplate === template
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                  >
                    {template}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1 p-6 bg-gray-50">
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm h-full max-w-2xl mx-auto">
              <p className="text-gray-400 text-xs mb-4">To: {'{{email}}'}</p>
              <div className="prose prose-sm max-w-none">
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => setContent(e.target.innerHTML)}
                  className="min-h-[200px] focus:outline-none"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {stats && (
                <>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    Last sent: {new Date(stats.last_sent).toLocaleTimeString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    {stats.delivery_rate}% Delivery
                  </span>
                </>
              )}
            </div>
            <Button size="sm">Save Template</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
