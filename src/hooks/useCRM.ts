import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CRMMessage, Profile, TypingIndicator, PendingMessage, MessageSyncStatus } from '../../types';
import { realtimeCRM } from '../services/realtime-crm';
import { messageCache } from '../services/message-cache';
import { useToast } from '../context/ToastContext';
import { errorLogger } from '../services/error-logger';

interface UseCRMReturn {
  messages: CRMMessage[];
  contacts: Profile[];
  loading: boolean;
  error: string | null;
  selectedContact: Profile | null;
  setSelectedContact: (contact: Profile | null) => void;
  sendMessage: (message: string, channel: 'email' | 'whatsapp') => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshContacts: () => Promise<void>;
  typingIndicators: TypingIndicator[];
  syncStatus: MessageSyncStatus | null;
  isOnline: boolean;
  markAsRead: (contactId: string) => Promise<void>;
  sendTypingIndicator: (isTyping: boolean, channel: 'email' | 'whatsapp') => Promise<void>;
  retryCount: number;
  hasError: boolean;
  canRetry: boolean;
}

export const useCRM = (): UseCRMReturn => {
  const [messages, setMessages] = useState<CRMMessage[]>([]);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [syncStatus, setSyncStatus] = useState<MessageSyncStatus | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  
  const currentUserId = useRef<string | null>(null);
  const toast = useToast();

  const logError = useCallback(async (error: Error, context: string) => {
    await errorLogger.logErrorAuto(error, {
      type: 'api-error',
      severity: 'medium',
      context: {
        component: 'useCRM',
        operation: context,
        selectedContactId: selectedContact?.id,
        retryCount
      }
    });
  }, [selectedContact?.id, retryCount]);

  const fetchContacts = useCallback(async (isRetry: boolean = false) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
      
      if (isRetry) {
        toast.showSuccess('Contacts refreshed successfully');
      }
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message);
      await logError(err, 'fetchContacts');
      toast.showError('Failed to load contacts', err.message);
    }
  }, [toast, logError]);

  const fetchMessages = useCallback(async (isRetry: boolean = false) => {
    if (!selectedContact) return;

    try {
      setLoading(true);
      setError(null);
      
      // Use realtime service for message history sync
      const messages = await realtimeCRM.syncMessageHistory(selectedContact.id);
      setMessages(messages);

      // Update sync status
      const status = messageCache.getSyncStatus(selectedContact.id);
      setSyncStatus(status);

      // Get pending messages for this contact
      const pending = messageCache.getPendingMessages(selectedContact.id);
      setPendingMessages(pending);

      if (isRetry) {
        toast.showSuccess('Messages refreshed successfully');
      }

    } catch (err: any) {
      console.error('Error fetching CRM messages:', err);
      setError(err.message);
      await logError(err, 'fetchMessages');
      toast.showError('Failed to load messages', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedContact, toast, logError]);

  const refreshMessages = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    await fetchMessages(true);
  }, [fetchMessages]);

  const refreshContacts = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    await fetchContacts(true);
  }, [fetchContacts]);

  useEffect(() => {
    if (!contacts.length) {
      return;
    }

    const alreadySelected = selectedContact && contacts.some(contact => contact.id === selectedContact.id);
    if (!alreadySelected) {
      setSelectedContact(contacts[0]);
    }
  }, [contacts, selectedContact]);

  const sendMessage = useCallback(async (message: string, channel: 'email' | 'whatsapp') => {
    if (!selectedContact) {
      const errorMsg = 'No contact selected';
      setError(errorMsg);
      toast.showError('Cannot send message', errorMsg);
      return;
    }

    if (!message.trim()) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Create optimistic message for immediate UI update
      const optimisticMessage: CRMMessage = {
        id: tempId,
        user_id: selectedContact.id,
        channel,
        sender: 'admin',
        message,
        timestamp: new Date().toISOString(),
        delivery_status: 'pending',
        meta: {
          contact_name: selectedContact.name,
          contact_email: selectedContact.email,
          contact_phone: selectedContact.phone
        }
      };

      // Add to messages immediately for optimistic UI
      setMessages(prev => [optimisticMessage, ...prev]);

      if (isOnline) {
        // Send to database if online
        const { data, error } = await supabase
          .from('crm_messages')
          .insert({
            temp_id: tempId,
            user_id: selectedContact.id,
            channel,
            sender: 'admin',
            message,
            delivery_status: 'pending',
            meta: {
              contact_name: selectedContact.name,
              contact_email: selectedContact.email,
              contact_phone: selectedContact.phone
            }
          })
          .select()
          .single();

        if (error) throw error;

        // Update message with real ID
        setMessages(prev => prev.map(msg =>
          msg.id === tempId ? { ...data, temp_id: tempId } : msg
        ));

        // Update delivery status
        await realtimeCRM.updateMessageStatus(data.id, 'sent');
        
        toast.showSuccess('Message sent successfully');

      } else {
        // Add to pending messages if offline
        const pendingMessage = messageCache.addPendingMessage(selectedContact.id, message, channel);
        setPendingMessages(prev => [...prev, pendingMessage]);
        toast.showInfo('Message queued', 'Will send when connection is restored');
      }

    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
      await logError(err, 'sendMessage');
      toast.showError('Failed to send message', err.message);
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id === tempId));
    }
  }, [selectedContact, isOnline, toast, logError]);

  const markAsRead = useCallback(async (contactId: string) => {
    try {
      await realtimeCRM.markMessagesAsRead(contactId);
      
      // Update local messages to reflect read status
      setMessages(prev => prev.map(msg =>
        (msg.user_id === contactId && msg.sender === 'user')
          ? { ...msg, delivery_status: 'read' as const, read_at: new Date().toISOString() }
          : msg
      ));
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
    }
  }, []);

  const sendTypingIndicator = useCallback(async (isTyping: boolean, channel: 'email' | 'whatsapp') => {
    if (!selectedContact || !isOnline) return;
    
    try {
      await realtimeCRM.sendTypingIndicator(selectedContact.id, isTyping, channel);
    } catch (err: any) {
      console.error('Error sending typing indicator:', err);
    }
  }, [selectedContact, isOnline]);

  // Initialize current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId.current = user?.id || null;
    };
    getCurrentUser();
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchContacts();
      setLoading(false);
    };
    loadData();
  }, []);

  // Handle contact selection and real-time subscription
  useEffect(() => {
    if (selectedContact && currentUserId.current) {
      fetchMessages();
      
      // Subscribe to real-time updates for this contact
      realtimeCRM.subscribeToContact(selectedContact.id, currentUserId.current);
      
      return () => {
        realtimeCRM.unsubscribeFromContact(selectedContact.id);
      };
    }
  }, [selectedContact, fetchMessages]);

  // Set up real-time event handlers
  useEffect(() => {
    const handleNewMessage = (event: any) => {
      if (event.payload.user_id === selectedContact?.id) {
        setMessages(prev => [event.payload, ...prev]);
        
        // Mark as read if it's from user
        if (event.payload.sender === 'user') {
          setTimeout(() => markAsRead(event.payload.user_id), 1000);
        }
      }
    };

    const handleMessageUpdated = (event: any) => {
      setMessages(prev => prev.map(msg =>
        msg.id === event.payload.id || msg.temp_id === event.payload.temp_id
          ? { ...msg, ...event.payload }
          : msg
      ));
    };

    const handleTypingIndicator = (event: any) => {
      const { contact_id, is_typing, channel } = event.payload;
      if (contact_id === selectedContact?.id) {
        setTypingIndicators(prev => {
          const filtered = prev.filter(t =>
            !(t.contact_id === contact_id && t.channel === channel)
          );
          
          if (is_typing) {
            return [...filtered, event.payload];
          }
          
          return filtered;
        });
      }
    };

    const handleConnectionChange = (event: any) => {
      setIsOnline(event.payload.isOnline);
      
      if (event.payload.isOnline && selectedContact) {
        // Sync when coming back online
        realtimeCRM.syncMessageHistory(selectedContact.id);
      }
    };

    // Subscribe to events
    realtimeCRM.on('new_message', handleNewMessage);
    realtimeCRM.on('message_updated', handleMessageUpdated);
    realtimeCRM.on('typing_indicator', handleTypingIndicator);
    realtimeCRM.on('online', handleConnectionChange);
    realtimeCRM.on('offline', handleConnectionChange);

    // Cleanup
    return () => {
      realtimeCRM.off('new_message', handleNewMessage);
      realtimeCRM.off('message_updated', handleMessageUpdated);
      realtimeCRM.off('typing_indicator', handleTypingIndicator);
      realtimeCRM.off('online', handleConnectionChange);
      realtimeCRM.off('offline', handleConnectionChange);
    };
  }, [selectedContact, markAsRead]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realtimeCRM.unsubscribeAll();
    };
  }, []);

  return {
    messages,
    contacts,
    loading,
    error,
    selectedContact,
    setSelectedContact,
    sendMessage,
    refreshMessages,
    refreshContacts,
    typingIndicators,
    syncStatus,
    isOnline,
    markAsRead,
    sendTypingIndicator,
    retryCount,
    hasError: !!error,
    canRetry: retryCount < 3
  };
};