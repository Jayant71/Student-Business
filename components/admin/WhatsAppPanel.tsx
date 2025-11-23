import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Plus, Search, Loader2, AlertCircle, CheckCircle2, Pause, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { whatsappService, WhatsAppCampaign, WhatsAppCampaignRequest, WhatsAppStats } from '../../src/services';

export const WhatsAppPanel: React.FC = () => {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    template: 'welcome_template',
    contacts: [{ phone_number: '', name: '' }]
  });

  useEffect(() => {
    loadCampaigns();
    loadStats();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const response = await whatsappService.getCampaigns();
      if (response.data) {
        setCampaigns(response.data);
      }
    } catch (err) {
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await whatsappService.getStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || newCampaign.contacts.every(c => !c.phone_number)) {
      setError('Please fill in campaign name and at least one phone number');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await whatsappService.createCampaign(newCampaign as WhatsAppCampaignRequest);
      if (response.data) {
        setSuccess('Campaign created successfully!');
        setShowNewCampaignForm(false);
        setNewCampaign({ name: '', template: 'welcome_template', contacts: [{ phone_number: '', name: '' }] });
        loadCampaigns();
      }
    } catch (err) {
      setError('Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handlePauseResumeCampaign = async (campaignId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        await whatsappService.pauseCampaign(campaignId);
      } else {
        await whatsappService.resumeCampaign(campaignId);
      }
      loadCampaigns();
    } catch (err) {
      setError('Failed to update campaign status');
    }
  };

  const addContactField = () => {
    setNewCampaign(prev => ({
      ...prev,
      contacts: [...prev.contacts, { phone_number: '', name: '' }]
    }));
  };

  const updateContact = (index: number, field: 'phone_number' | 'name', value: string) => {
    setNewCampaign(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Campaign Manager */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
                    <MessageCircle className="text-[#25D366]" /> WhatsApp Automation
                </h1>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => setShowNewCampaignForm(true)}
                >
                    <Plus size={16} className="mr-2"/> New Campaign
                </Button>
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}
            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            )}

            {/* New Campaign Form */}
            {showNewCampaignForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-700 mb-4">Create New Campaign</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Campaign Name</label>
                    <input
                      type="text"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                      placeholder="e.g., Welcome Sequence - Batch 1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Template</label>
                    <select
                      value={newCampaign.template}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, template: e.target.value }))}
                      className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                    >
                      <option value="welcome_template">Welcome Message</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Contacts</label>
                    {newCampaign.contacts.map((contact, index) => (
                      <div key={index} className="flex gap-2 mt-2">
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => updateContact(index, 'name', e.target.value)}
                          className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                          placeholder="Name (optional)"
                        />
                        <input
                          type="tel"
                          value={contact.phone_number}
                          onChange={(e) => updateContact(index, 'phone_number', e.target.value)}
                          className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                          placeholder="Phone number"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addContactField}
                      className="mt-2"
                    >
                      <Plus size={14} className="mr-1" /> Add Contact
                    </Button>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCampaignForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCampaign}
                      disabled={creating}
                    >
                      {creating ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                      Create Campaign
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700">Campaigns</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none"
                        />
                    </div>
                </div>
                <div className="overflow-y-auto p-4 space-y-3">
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={24} className="animate-spin text-gray-400" />
                      </div>
                    ) : filteredCampaigns.length > 0 ? (
                      filteredCampaigns.map(campaign => (
                        <div key={campaign.id} className="border border-gray-100 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-sm text-dark">{campaign.name}</h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  Sent to {campaign.contacts_count} contacts •
                                  {campaign.sent_count > 0 && ` ${Math.round((campaign.read_count / campaign.sent_count) * 100)}% Read rate`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                  campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                                  campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {campaign.status}
                                </span>
                                {campaign.status === 'active' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePauseResumeCampaign(campaign.id, campaign.status)}
                                  >
                                    <Pause size={14} />
                                  </Button>
                                )}
                                {campaign.status === 'paused' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePauseResumeCampaign(campaign.id, campaign.status)}
                                  >
                                    <Play size={14} />
                                  </Button>
                                )}
                            </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                        <p>No campaigns found</p>
                      </div>
                    )}
                </div>
            </div>
        </div>

        {/* Right Side: Preview & Stats */}
        <div className="space-y-6">
            {/* Stats Card */}
            {stats && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-700 mb-4">WhatsApp Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-dark">{stats.total_sent}</div>
                    <div className="text-xs text-gray-500">Total Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.read_rate}%</div>
                    <div className="text-xs text-gray-500">Read Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.total_replied}</div>
                    <div className="text-xs text-gray-500">Replies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.reply_rate}%</div>
                    <div className="text-xs text-gray-500">Reply Rate</div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden flex flex-col h-[600px] lg:h-auto mx-auto w-full max-w-sm">
                <div className="bg-[#075E54] p-4 text-white flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <MessageCircle size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">Future Founders</h4>
                        <p className="text-[10px] opacity-80">Business Account</p>
                    </div>
                </div>
                
                <div className="flex-1 bg-[#E5DDD5] p-4 overflow-y-auto space-y-4" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
                    <div className="flex justify-center">
                        <span className="bg-[#DCF8C6] text-gray-600 text-[10px] px-2 py-1 rounded-lg shadow-sm">Today</span>
                    </div>
                    
                    <div className="bg-white p-3 rounded-tr-lg rounded-br-lg rounded-bl-lg max-w-[85%] shadow-sm text-sm text-gray-800">
                        <p>Hi Sarah! 👋</p>
                        <p className="mt-2">Thanks for your interest in the No-Code Course. Here is the brochure you requested.</p>
                        <div className="mt-2 bg-gray-100 p-2 rounded flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 text-red-500 rounded flex items-center justify-center font-bold text-xs">PDF</div>
                            <span className="text-xs truncate">course-curriculum.pdf</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block text-right mt-1">10:42 AM</span>
                    </div>

                     <div className="bg-[#DCF8C6] p-3 rounded-tl-lg rounded-bl-lg rounded-br-lg max-w-[85%] shadow-sm text-sm text-gray-800 self-end ml-auto">
                        <p>When is the next batch starting?</p>
                        <span className="text-[10px] text-gray-400 block text-right mt-1">10:45 AM ✓✓</span>
                    </div>
                </div>

                <div className="p-3 bg-gray-100 flex gap-2">
                    <input type="text" placeholder="Type a message" className="flex-1 rounded-full px-4 py-2 text-sm border-none focus:ring-0" disabled />
                    <button className="bg-[#128C7E] text-white p-2 rounded-full"><Send size={16} /></button>
                </div>
            </div>
        </div>
    </div>
  );
};
