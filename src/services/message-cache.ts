import { CRMMessage, MessageCache, PendingMessage, MessageSyncStatus } from '../../types';

class MessageCacheService {
  private readonly CACHE_KEY = 'crm_message_cache';
  private readonly SYNC_STATUS_KEY = 'crm_sync_status';
  private readonly PENDING_MESSAGES_KEY = 'crm_pending_messages';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private isLocalStorageAvailable: boolean = false;

  constructor() {
    this.checkLocalStorageAvailability();
  }

  private checkLocalStorageAvailability(): void {
    try {
      const testKey = 'test_localstorage_availability';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.isLocalStorageAvailable = true;
    } catch (error) {
      console.warn('localStorage is not available:', error);
      this.isLocalStorageAvailable = false;
    }
  }

  // Message caching
  getCachedMessages(contactId: string): MessageCache | null {
    if (!this.isLocalStorageAvailable) return null;

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

      // Validate cache structure
      if (!this.validateMessageCache(cache)) {
        console.warn('Invalid cache structure for contact:', contactId);
        this.clearCachedMessages(contactId);
        return null;
      }

      return cache;
    } catch (error) {
      console.error('Error getting cached messages:', error);
      this.clearCachedMessages(contactId); // Clear potentially corrupted cache
      return null;
    }
  }

  private validateMessageCache(cache: any): cache is MessageCache {
    return (
      cache &&
      typeof cache === 'object' &&
      Array.isArray(cache.messages) &&
      typeof cache.last_sync === 'string' &&
      typeof cache.contact_id === 'string' &&
      Array.isArray(cache.pending_messages)
    );
  }

  setCachedMessages(contactId: string, messages: CRMMessage[]): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      // Check cache size before setting
      if (this.getCacheSize() > this.MAX_CACHE_SIZE) {
        console.warn('Cache size limit reached, clearing old entries');
        this.clearOldCacheEntries();
      }

      const cache: MessageCache = {
        messages: messages || [], // Ensure messages is always an array
        last_sync: new Date().toISOString(),
        contact_id: contactId,
        pending_messages: this.getPendingMessages(contactId)
      };

      const serialized = JSON.stringify(cache);
      localStorage.setItem(`${this.CACHE_KEY}_${contactId}`, serialized);
    } catch (error) {
      console.error('Error setting cached messages:', error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('Storage quota exceeded, clearing cache and retrying');
        this.clearAllCache();
        // Retry once after clearing
        try {
          const cache: MessageCache = {
            messages: messages || [],
            last_sync: new Date().toISOString(),
            contact_id: contactId,
            pending_messages: []
          };
          localStorage.setItem(`${this.CACHE_KEY}_${contactId}`, JSON.stringify(cache));
        } catch (retryError) {
          console.error('Failed to set cache after clearing:', retryError);
        }
      }
    }
  }

  clearCachedMessages(contactId: string): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      localStorage.removeItem(`${this.CACHE_KEY}_${contactId}`);
    } catch (error) {
      console.error('Error clearing cached messages:', error);
    }
  }

  // Pending messages for offline support
  getPendingMessages(contactId: string): PendingMessage[] {
    if (!this.isLocalStorageAvailable) return [];

    try {
      const pending = localStorage.getItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`);
      if (!pending) return [];
      
      const messages = JSON.parse(pending);
      return Array.isArray(messages) ? messages : [];
    } catch (error) {
      console.error('Error getting pending messages:', error);
      this.clearPendingMessages(contactId); // Clear potentially corrupted data
      return [];
    }
  }

  addPendingMessage(contactId: string, message: string, channel: 'email' | 'whatsapp'): PendingMessage | null {
    if (!this.isLocalStorageAvailable) return null;

    const pendingMessage: PendingMessage = {
      temp_id: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      contact_id: contactId,
      channel,
      message: message || '', // Ensure message is not undefined
      timestamp: new Date().toISOString(),
      retry_count: 0,
      status: 'pending'
    };

    try {
      const pending = this.getPendingMessages(contactId);
      
      // Limit pending messages to prevent storage bloat
      if (pending.length >= 50) {
        console.warn('Too many pending messages, removing oldest ones');
        pending.splice(0, pending.length - 49); // Keep only the most recent 49
      }
      
      pending.push(pendingMessage);
      localStorage.setItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`, JSON.stringify(pending));
      return pendingMessage;
    } catch (error) {
      console.error('Error adding pending message:', error);
      return null;
    }
  }

  removePendingMessage(contactId: string, tempId: string): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      const pending = this.getPendingMessages(contactId);
      const filtered = pending.filter(msg => msg.temp_id !== tempId);
      localStorage.setItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing pending message:', error);
    }
  }

  updatePendingMessageStatus(contactId: string, tempId: string, status: 'pending' | 'failed'): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      const pending = this.getPendingMessages(contactId);
      const messageIndex = pending.findIndex(msg => msg.temp_id === tempId);
      if (messageIndex !== -1) {
        pending[messageIndex].status = status;
        if (status === 'failed') {
          pending[messageIndex].retry_count++;
        }
        localStorage.setItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`, JSON.stringify(pending));
      }
    } catch (error) {
      console.error('Error updating pending message status:', error);
    }
  }

  clearPendingMessages(contactId: string): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      localStorage.removeItem(`${this.PENDING_MESSAGES_KEY}_${contactId}`);
    } catch (error) {
      console.error('Error clearing pending messages:', error);
    }
  }

  // Sync status tracking
  getSyncStatus(contactId: string): MessageSyncStatus | null {
    if (!this.isLocalStorageAvailable) return null;

    try {
      const status = localStorage.getItem(`${this.SYNC_STATUS_KEY}_${contactId}`);
      if (!status) return null;
      
      const parsed = JSON.parse(status);
      return this.validateMessageSyncStatus(parsed) ? parsed : null;
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }

  private validateMessageSyncStatus(status: any): status is MessageSyncStatus {
    return (
      status &&
      typeof status === 'object' &&
      typeof status.last_sync === 'string' &&
      typeof status.pending_count === 'number' &&
      typeof status.failed_count === 'number' &&
      typeof status.is_online === 'boolean'
    );
  }

  updateSyncStatus(contactId: string, updates: Partial<MessageSyncStatus>): void {
    if (!this.isLocalStorageAvailable) return;

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
    if (!this.isLocalStorageAvailable) return [];

    try {
      const keys = Object.keys(localStorage);
      const contactIds = keys
        .filter(key => key.startsWith(this.CACHE_KEY))
        .map(key => key.replace(`${this.CACHE_KEY}_`, ''))
        .filter(contactId => contactId.length > 0); // Ensure valid contact IDs
      return contactIds;
    } catch (error) {
      console.error('Error getting cached contacts:', error);
      return [];
    }
  }

  clearAllCache(): void {
    if (!this.isLocalStorageAvailable) return;

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

  private clearOldCacheEntries(): void {
    if (!this.isLocalStorageAvailable) return;

    try {
      const contacts = this.getAllCachedContacts();
      const now = new Date().getTime();
      
      // Clear entries older than 7 days
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      contacts.forEach(contactId => {
        const cache = this.getCachedMessages(contactId);
        if (cache && new Date(cache.last_sync).getTime() < sevenDaysAgo) {
          this.clearCachedMessages(contactId);
          this.clearPendingMessages(contactId);
          const statusKey = `${this.SYNC_STATUS_KEY}_${contactId}`;
          localStorage.removeItem(statusKey);
        }
      });
    } catch (error) {
      console.error('Error clearing old cache entries:', error);
    }
  }

  // Get cache size for monitoring
  getCacheSize(): number {
    if (!this.isLocalStorageAvailable) return 0;

    try {
      let size = 0;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_KEY) ||
            key.startsWith(this.PENDING_MESSAGES_KEY) ||
            key.startsWith(this.SYNC_STATUS_KEY)) {
          const item = localStorage.getItem(key);
          if (item) {
            size += item.length * 2; // Approximate bytes (UTF-16)
          }
        }
      });
      return size;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }

  // Get cache statistics
  getCacheStats(): {
    totalSize: number;
    totalContacts: number;
    totalMessages: number;
    totalPendingMessages: number;
    oldestEntry?: string;
    newestEntry?: string;
  } {
    if (!this.isLocalStorageAvailable) {
      return {
        totalSize: 0,
        totalContacts: 0,
        totalMessages: 0,
        totalPendingMessages: 0
      };
    }

    const contacts = this.getAllCachedContacts();
    let totalMessages = 0;
    let totalPendingMessages = 0;
    let oldestTimestamp: string | undefined;
    let newestTimestamp: string | undefined;

    contacts.forEach(contactId => {
      const cache = this.getCachedMessages(contactId);
      if (cache) {
        totalMessages += cache.messages.length;
        totalPendingMessages += cache.pending_messages.length;
        
        if (!oldestTimestamp || cache.last_sync < oldestTimestamp) {
          oldestTimestamp = cache.last_sync;
        }
        if (!newestTimestamp || cache.last_sync > newestTimestamp) {
          newestTimestamp = cache.last_sync;
        }
      }
    });

    return {
      totalSize: this.getCacheSize(),
      totalContacts: contacts.length,
      totalMessages,
      totalPendingMessages,
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    };
  }
}

export const messageCache = new MessageCacheService();