import { supabase } from '../lib/supabase';
import { CRMMessage, TypingIndicator, RealtimeEvent, MessageDeliveryStatus } from '../../types';
import { messageCache } from './message-cache';

export class RealtimeCRMService {
  private subscriptions: Map<string, any> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private eventHandlers: Map<string, ((event: RealtimeEvent) => void)[]> = new Map();
  private isDestroyed: boolean = false;

  constructor() {
    this.setupNetworkListeners();
  }

  // Subscribe to real-time updates for a specific contact
  subscribeToContact(contactId: string, userId?: string): any {
    if (this.isDestroyed) {
      console.warn('RealtimeCRMService is destroyed, cannot subscribe');
      return null;
    }

    const channelName = `crm_contact_${contactId}`;
    
    // Unsubscribe from existing channel if any
    this.unsubscribeFromContact(contactId);

    try {
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crm_messages',
            filter: `user_id=eq.${contactId}`
          },
          (payload) => this.handleMessageChange(payload)
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'typing_indicators',
            filter: `contact_id=eq.${contactId}`
          },
          (payload) => this.handleTypingIndicator(payload)
        )
        .subscribe((status) => {
          console.log(`Realtime subscription status for ${contactId}:`, status);
          if (status === 'SUBSCRIBED') {
            this.emit('message', { type: 'message', payload: { contactId }, timestamp: new Date().toISOString() });
          } else if (status === 'CHANNEL_ERROR') {
            this.emit('error', { type: 'error', payload: { contactId, error: 'Connection failed' }, timestamp: new Date().toISOString() });
          }
        });

      this.subscriptions.set(contactId, channel);
      return channel;
    } catch (error) {
      console.error('Error subscribing to contact:', error);
      this.emit('error', {
        type: 'error',
        payload: { contactId, error: error instanceof Error ? error.message : 'Subscription failed' },
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  // Unsubscribe from a contact's real-time updates
  unsubscribeFromContact(contactId: string): void {
    const channel = this.subscriptions.get(contactId);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
      this.subscriptions.delete(contactId);
    }

    // Clear typing timeouts
    const timeout = this.typingTimeouts.get(contactId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(contactId);
    }
  }

  // Unsubscribe from all real-time updates
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel, contactId) => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.error(`Error removing channel for ${contactId}:`, error);
      }
    });
    this.subscriptions.clear();
    
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
  }

  // Send typing indicator
  async sendTypingIndicator(contactId: string, isTyping: boolean, channel: 'email' | 'whatsapp'): Promise<void> {
    if (this.isDestroyed) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clear existing timeout
      const existingTimeout = this.typingTimeouts.get(contactId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Send typing indicator
      const { error } = await supabase.rpc('upsert_typing_indicator', {
        p_user_id: user.id,
        p_contact_id: contactId,
        p_is_typing: isTyping,
        p_channel: channel
      });

      if (error) {
        console.error('Error sending typing indicator:', error);
        this.emit('error', {
          type: 'error',
          payload: { contactId, error: error.message },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // If typing, set a timeout to stop typing after 3 seconds
      if (isTyping) {
        const timeout = setTimeout(() => {
          if (!this.isDestroyed) {
            this.sendTypingIndicator(contactId, false, channel);
          }
        }, 3000);
        this.typingTimeouts.set(contactId, timeout);
      }

      this.emit('typing', {
        type: 'typing',
        payload: { contactId, isTyping, channel },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in sendTypingIndicator:', error);
      this.emit('error', {
        type: 'error',
        payload: { contactId, error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Update message delivery status
  async updateMessageStatus(messageId: string, status: MessageDeliveryStatus): Promise<void> {
    if (this.isDestroyed) return;

    try {
      const updateData: Record<string, any> = {
        delivery_status: status
      };

      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (status === 'read') {
        updateData.read_at = new Date().toISOString();
        updateData.delivered_at = new Date().toISOString(); // Ensure delivered is set when read
      }

      const { error } = await supabase
        .from('crm_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message status:', error);
        this.emit('error', {
          type: 'error',
          payload: { messageId, error: error.message },
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.emit('delivery_status', {
        type: 'delivery_status',
        payload: { messageId, status },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in updateMessageStatus:', error);
      this.emit('error', {
        type: 'error',
        payload: { messageId, error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString()
      });
    }
  }

  // Mark messages as read
  async markMessagesAsRead(contactId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('crm_messages')
        .update({ 
          delivery_status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('user_id', contactId)
        .eq('sender', 'user')
        .in('delivery_status', ['sent', 'delivered']);

      if (error) {
        console.error('Error marking messages as read:', error);
        return;
      }

      this.emit('messages_read', {
        type: 'read_receipt',
        payload: { contactId },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in markMessagesAsRead:', error);
    }
  }

  // Sync message history when opening conversation
  async syncMessageHistory(contactId: string): Promise<CRMMessage[]> {
    try {
      // Check cache first
      const cached = messageCache.getCachedMessages(contactId);
      if (cached && messageCache.isOnline()) {
        // Return cached messages immediately, then sync in background
        setTimeout(() => this.backgroundSync(contactId), 0);
        return cached.messages;
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('crm_messages')
        .select('*')
        .or(`user_id.eq.${contactId},admin_id.eq.${contactId}`)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      const messages = data || [];
      
      // Update cache
      messageCache.setCachedMessages(contactId, messages);
      
      // Update sync status
      messageCache.updateSyncStatus(contactId, {
        last_sync: new Date().toISOString(),
        pending_count: 0,
        is_online: true
      });

      this.emit('history_synced', {
        type: 'message',
        payload: { contactId, messages },
        timestamp: new Date().toISOString()
      });

      return messages;

    } catch (error) {
      console.error('Error syncing message history:', error);
      
      // Return cached messages if available
      const cached = messageCache.getCachedMessages(contactId);
      if (cached) {
        return cached.messages;
      }
      
      throw error;
    }
  }

  // Background sync for offline support
  private async backgroundSync(contactId: string) {
    try {
      if (!messageCache.isOnline()) return;

      const { data, error } = await supabase
        .from('crm_messages')
        .select('*')
        .or(`user_id.eq.${contactId},admin_id.eq.${contactId}`)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      const messages = data || [];
      messageCache.setCachedMessages(contactId, messages);

      // Process pending messages
      await this.processPendingMessages(contactId);

    } catch (error) {
      console.error('Error in background sync:', error);
    }
  }

  // Process pending messages when coming back online
  private async processPendingMessages(contactId: string) {
    const pending = messageCache.getPendingMessages(contactId);
    
    for (const pendingMessage of pending) {
      if (pendingMessage.status === 'pending' && pendingMessage.retry_count < 3) {
        try {
          // Try to send the message
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;

          const { error } = await supabase
            .from('crm_messages')
            .insert({
              temp_id: pendingMessage.temp_id,
              user_id: contactId,
              channel: pendingMessage.channel,
              sender: 'admin',
              message: pendingMessage.message,
              delivery_status: 'pending'
            });

          if (error) {
            throw error;
          }

          // Remove from pending if successful
          messageCache.removePendingMessage(contactId, pendingMessage.temp_id);

        } catch (error) {
          console.error('Error processing pending message:', error);
          messageCache.updatePendingMessageStatus(contactId, pendingMessage.temp_id, 'failed');
        }
      }
    }
  }

  // Handle real-time message changes
  private handleMessageChange(payload: any): void {
    if (this.isDestroyed) return;
    
    console.log('Message change:', payload);
    
    if (payload.eventType === 'INSERT') {
      this.emit('message', {
        type: 'message',
        payload: payload.new,
        timestamp: new Date().toISOString()
      });
    } else if (payload.eventType === 'UPDATE') {
      this.emit('delivery_status', {
        type: 'delivery_status',
        payload: payload.new,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle typing indicator changes
  private handleTypingIndicator(payload: any): void {
    if (this.isDestroyed) return;
    
    console.log('Typing indicator:', payload);
    
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      this.emit('typing', {
        type: 'typing',
        payload: payload.new,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Event handling
  on(event: string, handler: (event: RealtimeEvent) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: (event: RealtimeEvent) => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: RealtimeEvent) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Network status monitoring
  private setupNetworkListeners(): void {
    const handleOnline = () => {
      if (this.isDestroyed) return;
      console.log('Network restored');
      this.emit('connection', { type: 'connection', payload: { isOnline: true }, timestamp: new Date().toISOString() });
      
      // Sync all cached contacts when coming back online
      const contacts = messageCache.getAllCachedContacts();
      contacts.forEach(contactId => {
        this.backgroundSync(contactId);
      });
    };

    const handleOffline = () => {
      if (this.isDestroyed) return;
      console.log('Network lost');
      this.emit('connection', { type: 'connection', payload: { isOnline: false }, timestamp: new Date().toISOString() });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // Get connection status
  getConnectionStatus(): { connected: boolean; subscriptions: string[] } {
    return {
      connected: this.subscriptions.size > 0,
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }

  // Cleanup method
  destroy(): void {
    this.isDestroyed = true;
    this.unsubscribeAll();
    this.eventHandlers.clear();
  }
}

export const realtimeCRM = new RealtimeCRMService();