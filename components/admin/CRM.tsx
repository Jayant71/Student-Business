import React, { useState, useRef, useEffect } from 'react';
import { Search, MoreVertical, Phone, Mail, DollarSign, CheckCircle, Tag, Send, MessageSquare, Clock, Check, CheckCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { useCRM } from '../../src/hooks/useCRM';
import { CRMMessage, MessageDeliveryStatus } from '../../types';

export const CRM: React.FC = () => {
  const {
    messages,
    contacts,
    loading,
    error,
    selectedContact,
    setSelectedContact,
    sendMessage,
    refreshMessages,
    typingIndicators,
    syncStatus,
    isOnline,
    markAsRead,
    sendTypingIndicator
  } = useCRM();

  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'email' | 'whatsapp'>('whatsapp');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContact) return;
    
    await sendMessage(messageInput, selectedChannel);
    setMessageInput('');
    
    // Stop typing indicator
    sendTypingIndicator(false, selectedChannel);
    setIsTyping(false);
  };

  const handleTyping = (value: string) => {
    setMessageInput(value);
    
    if (!isTyping && value.trim() && selectedContact) {
      setIsTyping(true);
      sendTypingIndicator(true, selectedChannel);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && selectedContact) {
        setIsTyping(false);
        sendTypingIndicator(false, selectedChannel);
      }
    }, 3000);
  };

  const getMessageStatusIcon = (status: MessageDeliveryStatus | undefined) => {
    switch (status) {
      case 'sent':
        return <Check size={14} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={14} className="text-blue-500" />;
      case 'pending':
        return <Clock size={14} className="text-yellow-500" />;
      case 'failed':
        return <Clock size={14} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getTypingIndicatorText = () => {
    const contactTyping = typingIndicators.find(t =>
      t.contact_id === selectedContact?.id && t.is_typing
    );
    
    if (!contactTyping) return null;
    
    const contactName = contacts.find(c => c.id === contactTyping.user_id)?.name || 'Someone';
    return `${contactName} is typing${contactTyping.channel === 'whatsapp' ? ' via WhatsApp' : ''}...`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail size={12} />;
      case 'whatsapp':
        return <MessageSquare size={12} />;
      case 'call':
        return <Phone size={12} />;
      default:
        return null;
    }
  };

  const groupMessagesByDate = (messages: CRMMessage[]) => {
    const groups: { [key: string]: CRMMessage[] } = {};
    
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return groups;
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading CRM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ Error loading CRM</div>
          <p className="text-gray-600">{error}</p>
          <Button onClick={refreshMessages} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Contact List */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-white transition-colors ${
                          selectedContact?.id === contact.id ? 'bg-white border-l-4 border-l-primary' : ''
                        }`}
                        onClick={() => setSelectedContact(contact)}
                      >
                          <div className="flex justify-between mb-1">
                              <span className="font-bold text-sm text-dark">
                                {contact.name || 'Unknown Contact'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {contact.created_at ? formatDate(contact.created_at) : ''}
                              </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          <div className="mt-2 flex gap-1">
                               <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Student</span>
                          </div>
                      </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <p>No contacts found</p>
                  </div>
                )}
            </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
            {selectedContact ? (
              <>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="font-bold text-dark">
                          {selectedContact.name || 'Unknown Contact'}
                        </h3>
                        <p className="text-xs text-gray-500">{selectedContact.email}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="p-2 rounded-full">
                          <Phone size={16}/>
                        </Button>
                        <Button variant="outline" size="sm" className="p-2 rounded-full">
                          <Mail size={16}/>
                        </Button>
                        <Button variant="outline" size="sm" className="p-2 rounded-full">
                          <MoreVertical size={16}/>
                        </Button>
                    </div>
                </div>
                
                <div className="flex-1 bg-gray-50 p-6 overflow-y-auto space-y-6">
                  {Object.entries(messageGroups).map(([date, dateMessages]) => (
                    <div key={date}>
                      <div className="flex justify-center mb-4">
                        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{date}</span>
                      </div>
                      
                      {dateMessages.map((message) => (
                        <div key={message.id} className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'} mb-4`}>
                          <div className={`max-w-md shadow-sm p-4 rounded-xl ${
                            message.sender === 'admin'
                              ? 'bg-primary text-white rounded-tl-xl rounded-bl-xl rounded-br-xl'
                              : 'bg-white border border-gray-200 rounded-tr-xl rounded-br-xl rounded-bl-xl'
                          }`}>
                            <p className="text-sm">{message.message}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                              message.sender === 'admin' ? 'text-blue-200' : 'text-gray-400'
                            }`}>
                              <span className="text-xs">
                                {formatTime(message.timestamp)} via {message.channel}
                              </span>
                              {message.sender === 'admin' && getMessageStatusIcon(message.delivery_status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No messages yet</p>
                      <p className="text-sm mt-2">Start a conversation with {selectedContact.name}</p>
                    </div>
                  )}
                  
                  {/* Typing Indicator */}
                  {getTypingIndicatorText() && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-white border border-gray-200 rounded-tr-xl rounded-br-xl rounded-bl-xl px-4 py-2 shadow-sm">
                        <div className="flex items-center gap-1">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 ml-2">{getTypingIndicatorText()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                    {/* Connection Status */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-2">
                        <Button
                          variant={selectedChannel === 'whatsapp' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedChannel('whatsapp')}
                          className="text-xs"
                        >
                          WhatsApp
                        </Button>
                        <Button
                          variant={selectedChannel === 'email' ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedChannel('email')}
                          className="text-xs"
                        >
                          Email
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-gray-500">
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                        {syncStatus && (
                          <span className="text-xs text-gray-400">
                            Last sync: {formatTime(syncStatus.last_sync)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Type a ${selectedChannel} message...`}
                          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-primary"
                          value={messageInput}
                          onChange={(e) => handleTyping(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          disabled={!isOnline}
                        />
                        <Button onClick={handleSendMessage} disabled={!messageInput.trim() || !isOnline}>
                          <Send size={16} />
                        </Button>
                    </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={24} />
                  </div>
                  <p>Select a contact to start messaging</p>
                </div>
              </div>
            )}
        </div>

        {/* Quick Actions Panel */}
        <div className="w-72 border-l border-gray-200 bg-white p-6 flex flex-col gap-6">
            <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">CRM Actions</h4>
                <div className="space-y-2">
                    <Button variant="outline" fullWidth className="justify-start gap-2 text-sm">
                      <CheckCircle size={16}/> Mark as Sold
                    </Button>
                    <Button variant="outline" fullWidth className="justify-start gap-2 text-sm">
                      <Tag size={16}/> Add Tag
                    </Button>
                </div>
            </div>

            <div>
                 <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Payment</h4>
                 <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                     <p className="text-sm text-gray-600 mb-2">Total Due</p>
                     <p className="text-2xl font-bold text-dark mb-4">$199.00</p>
                     <Button variant="accent" fullWidth className="gap-2 text-sm">
                       <DollarSign size={16}/> Send Link
                     </Button>
                 </div>
            </div>
        </div>
    </div>
  );
};
