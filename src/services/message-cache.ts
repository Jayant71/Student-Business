import { CRMMessage, MessageCache, PendingMessage, MessageSyncStatus } from '../../types';

class MessageCacheService {
  private readonly CACHE_KEY = 'crm_message_cache';
  private readonly SYNC_STATUS_KEY = 'crm_sync_status';
  private readonly PENDING_MESSAGES_KEY = 'crm_pending_messages';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  // Message caching
  getCachedMessages(contactId: string): MessageCache | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_KEY}_${contactId}`);
      if (!cached) return null;

      const cache: MessageCache = JSON.parse(cached);
      const now = new Date().getTime();

      // Check if cache is expired
      if (now - new Date(cache.last_sync).getTime() > this.CACHE_EXPIRY) {
        this.clearCachedMessages(contactId);
        return null;
      }

      return cache;
    } catch (error) {
      console.error('Error getting cached messages:', error);
      return null;
    }
  }

  setCachedMessages(contactId: string, messages: CRMMessage[]): void {
    try {
      const cache: MessageCache = {
        messages,
        last_sync: new Date().toISOString(),
        contact_id: contactId,
        pending_messages: this.getPendingMessages(contactId)
      };
      localStorage.setItem(`${this.CACHE_KEY}_${contactId}`, JSON.stringify(cache));
    } catch (error) {
      console.error('Error setting cached messages:', error);
    }
  }

  clearCachedMessages(contactId: string): void {
    try {
      localStorage.removeItem(`${this.CACHE_KEY}_${contactId}`);
    } catch (error) {
      console.error('Error clearing cached messages:', error);
    }
  }

  // Pending messages for offline support
  getPendingMessages(contactId: string): PendingMessage[] {
    try {
      const pending = localStorage.getItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`);
      return pending ? JSON.parse(pending) : [];
    } catch (error) {
      console.error('Error getting pending messages:', error);
      return [];
    }
  }

  addPendingMessage(contactId: string, message: string, channel: 'email' | 'whatsapp'): PendingMessage {
    const pendingMessage: PendingMessage = {
      temp_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contact_id: contactId,
      channel,
      message,
      timestamp: new Date().toISOString(),
      retry_count: 0,
      status: 'pending'
    };

    try {
      const pending = this.getPendingMessages(contactId);
      pending.push(pendingMessage);
      localStorage.setItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`, JSON.stringify(pending));
    } catch (error) {
      console.error('Error adding pending message:', error);
    }

    return pendingMessage;
  }

  removePendingMessage(contactId: string, tempId: string): void {
    try {
      const pending = this.getPendingMessages(contactId);
      const filtered = pending.filter(msg => msg.temp_id !== tempId);
      localStorage.setItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing pending message:', error);
    }
  }

  updatePendingMessageStatus(contactId: string, tempId: string, status: 'pending' | 'failed'): void {
    try {
      const pending = this.getPendingMessages(contactId);
      const message = pending.find(msg => msg.temp_id === tempId);
      if (message) {
        message.status = status;
        if (status === 'failed') {
          message.retry_count++;
        }
        localStorage.setItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`, JSON.stringify(pending));
      }
    } catch (error) {
      console.error('Error updating pending message status:', error);
    }
  }

  clearPendingMessages(contactId: string): void {
    try {
      localStorage.removeItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`);
    } catch (error) {
      console.error('Error clearing pending messages:', error);
    }
  }

  // Sync status tracking
  getSyncStatus(contactId: string): MessageSyncStatus | null {
    try {
      const status = localStorage.getItem(`${this.SYNC_STATUS_KEY}_${contactId}`);
      return status ? JSON.parse(status) : null;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  updateSyncStatus(contactId: string, updates: Partial<MessageSyncStatus>): void {
    try {
      const current = this.getSyncStatus(contactId) || {
        last_sync: new Date().toISOString(),
        pending_count: 0,
        failed_count: 0,
        is_online: navigator.onLine
      };

      const updated: MessageSyncStatus = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(`${this.SYNC_STATUS_KEY}_${contactId}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  // Utility methods
  isOnline(): boolean {
    return navigator.onLine;
  }

  getAllCachedContacts(): string[] {
    try {
      const keys = Object.keys(localStorage);
      const contactIds = keys
        .filter(key => key.startsWith(this.CACHE_KEY))
        .map(key => key.replace(`${this.CACHE_KEY}_`, ''));
      return contactIds;
    } catch (error) {
      console.error('Error getting cached contacts:', error);
      return [];
    }
  }

  clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_KEY) || 
            key.startsWith(this.PENDING_MESSAGES_KEY) || 
            key.startsWith(this.SYNC_STATUS_KEY)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  // Get cache size for monitoring
  getCacheSize(): number {
    try {
      let size = 0;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_KEY) || 
            key.startsWith(this.PENDING_MESSAGES_KEY) || 
            key.startsWith(this.SYNC_STATUS_KEY)) {
          size += localStorage.getItem(key)?.length || 0;
        }
      });
      return size;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }
}

export const messageCache = new MessageCacheService();