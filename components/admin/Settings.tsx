import React, { useState, useEffect } from 'react';
import { Key, CreditCard, User, Bell, Settings as SettingsIcon, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [mockMode, setMockMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const tabs = ['Development', 'API Keys', 'Integrations', 'Profile', 'Notifications'];

  useEffect(() => {
    // Fetch current mock mode setting
    fetchMockMode();
  }, []);

  const fetchMockMode = async () => {
    try {
      const response = await fetch('/api/admin/settings/mock-mode');
      if (response.ok) {
        const data = await response.json();
        setMockMode(data.mock_mode);
      }
    } catch (error) {
      console.error('Error fetching mock mode:', error);
    }
  };

  const toggleMockMode = async () => {
    setLoading(true);
    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/admin/settings/mock-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mock_mode: !mockMode }),
      });

      if (response.ok) {
        setMockMode(!mockMode);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Error toggling mock mode:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-dark">Settings</h1>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
                <nav className="flex px-4" aria-label="Tabs">
                    {tabs.map((tab, i) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(i)}
                            className={`px-4 py-4 text-sm font-medium border-b-2 ${
                                i === activeTab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-6 space-y-8">
                {/* Development Settings Tab */}
                {activeTab === 0 && (
                    <div>
                        <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                            <SettingsIcon size={18}/> Development Settings
                        </h3>
                        
                        <div className="space-y-6 max-w-2xl">
                            {/* Mock Mode Toggle */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-blue-900 mb-2">Mock Mode</h4>
                                        <p className="text-sm text-blue-700 mb-4">
                                            Enable mock mode to simulate external API calls (SendGrid, AiSensy, Bolna.ai, Instamojo)
                                            without requiring actual API keys. All actions will be logged to Supabase for visibility.
                                        </p>
                                        
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="text-sm font-medium text-gray-900">Current Status: </span>
                                                <span className={`text-sm font-bold ${mockMode ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {mockMode ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                            
                                            <Button
                                                onClick={toggleMockMode}
                                                disabled={loading}
                                                variant={mockMode ? "destructive" : "default"}
                                                size="sm"
                                            >
                                                {loading ? 'Saving...' : mockMode ? 'Disable Mock Mode' : 'Enable Mock Mode'}
                                            </Button>
                                        </div>
                                        
                                        {saveStatus !== 'idle' && (
                                            <div className={`mt-3 text-sm ${
                                                saveStatus === 'saved' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {saveStatus === 'saved' ? '✓ Settings saved successfully' : '✗ Failed to save settings'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {mockMode && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-900 mb-2">Mock Mode Active</h4>
                                    <ul className="text-sm text-green-700 space-y-1">
                                        <li>• Emails will be logged instead of sent</li>
                                        <li>• WhatsApp messages will be simulated</li>
                                        <li>• Payment links will be mock URLs</li>
                                        <li>• Voice calls will be simulated</li>
                                        <li>• All activities logged to Supabase</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* API Keys Section */}
                {activeTab === 1 && (
                    <div>
                        <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                            <Key size={18}/> API Configuration
                        </h3>
                        <div className="space-y-4 max-w-2xl">
                            <div>
                                <label className="text-xs font-bold text-gray-500">SendGrid API Key</label>
                                <input
                                    type="password"
                                    value={mockMode ? "Mock Mode Active - No API Key Required" : "SG.xxxxxxxxxxxx"}
                                    className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm bg-gray-50"
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">AiSensy API Key (WhatsApp)</label>
                                <input
                                    type="password"
                                    value={mockMode ? "Mock Mode Active - No API Key Required" : "xxxxxxxxxxxx"}
                                    className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm bg-gray-50"
                                    readOnly
                                />
                            </div>
                             <div>
                                <label className="text-xs font-bold text-gray-500">Bolna.ai API Key (Calling)</label>
                                <input
                                    type="password"
                                    value={mockMode ? "Mock Mode Active - No API Key Required" : "xxxxxxxxxxxx"}
                                    className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm bg-gray-50"
                                    readOnly
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500">Instamojo API Key</label>
                                <input
                                    type="password"
                                    value={mockMode ? "Mock Mode Active - No API Key Required" : "xxxxxxxxxxxx"}
                                    className="w-full mt-1 border border-gray-200 rounded-lg p-2 text-sm bg-gray-50"
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Other tabs would go here */}
                {activeTab === 2 && (
                    <div>
                        <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                            <CreditCard size={18}/> Integrations
                        </h3>
                        <p className="text-gray-600">Integration settings coming soon...</p>
                    </div>
                )}

                {activeTab === 3 && (
                    <div>
                        <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                            <User size={18}/> Profile
                        </h3>
                        <p className="text-gray-600">Profile settings coming soon...</p>
                    </div>
                )}

                {activeTab === 4 && (
                    <div>
                        <h3 className="font-bold text-dark mb-4 flex items-center gap-2">
                            <Bell size={18}/> Notifications
                        </h3>
                        <p className="text-gray-600">Notification settings coming soon...</p>
                    </div>
                )}

                <div className="pt-6 border-t border-gray-100">
                    <Button>Save Changes</Button>
                </div>
            </div>
        </div>
    </div>
  );
};
