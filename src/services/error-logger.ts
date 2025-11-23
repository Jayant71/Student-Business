import { supabase } from '../lib/supabase';

export interface ErrorLog {
  id?: string;
  error: string;
  stack?: string;
  component_stack?: string;
  timestamp: string;
  user_agent: string;
  url: string;
  type: 'react-error-boundary' | 'api-error' | 'unhandled-rejection' | 'network-error' | 'custom';
  user_id?: string;
  session_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  resolved?: boolean;
  created_at?: string;
}

export interface ErrorSummary {
  total_errors: number;
  errors_by_type: Record<string, number>;
  errors_by_severity: Record<string, number>;
  recent_errors: ErrorLog[];
  most_common_errors: Array<{
    error: string;
    count: number;
    last_occurred: string;
  }>;
}

class ErrorLogger {
  private isEnabled: boolean;
  private batchSize: number;
  private errorQueue: ErrorLog[] = [];
  private flushInterval: number;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.isEnabled = import.meta.env.PROD; // Only enable in production
    this.batchSize = 10;
    this.flushInterval = 30000; // 30 seconds
    
    if (this.isEnabled) {
      this.startFlushTimer();
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * Log an error to Supabase
   */
  async logError(errorData: Omit<ErrorLog, 'id' | 'created_at'>): Promise<string | null> {
    if (!this.isEnabled) {
      console.warn('Error logging is disabled in development');
      return null;
    }

    try {
      // Get current user and session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      const sessionId = session?.access_token ? session.access_token.slice(-10) : undefined;

      const errorLog: ErrorLog = {
        ...errorData,
        user_id: userId,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
      };

      // Add to queue for batch processing
      this.errorQueue.push(errorLog);

      // Flush immediately if queue is full or error is critical
      if (this.errorQueue.length >= this.batchSize || errorLog.severity === 'critical') {
        await this.flushErrors();
      }

      return 'queued';
    } catch (error) {
      console.error('Failed to log error:', error);
      return null;
    }
  }

  /**
   * Log error with automatic categorization
   */
  async logErrorAuto(
    error: Error | string,
    context: {
      type?: ErrorLog['type'];
      severity?: ErrorLog['severity'];
      context?: Record<string, any>;
      componentStack?: string;
    } = {}
  ): Promise<string | null> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Auto-determine severity based on error content
    let severity = context.severity || 'medium';
    if (!severity) {
      if (errorMessage.toLowerCase().includes('critical') || 
          errorMessage.toLowerCase().includes('fatal')) {
        severity = 'critical';
      } else if (errorMessage.toLowerCase().includes('network') ||
                 errorMessage.toLowerCase().includes('timeout')) {
        severity = 'high';
      } else if (errorMessage.toLowerCase().includes('warning')) {
        severity = 'low';
      }
    }

    return this.logError({
      error: errorMessage,
      stack: errorStack,
      component_stack: context.componentStack,
      type: context.type || 'custom',
      severity,
      context: context.context,
      user_agent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Flush queued errors to Supabase
   */
  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errorsToFlush = [...this.errorQueue];
    this.errorQueue = [];

    try {
      const { error } = await supabase
        .from('error_logs')
        .insert(errorsToFlush);

      if (error) {
        console.error('Failed to insert error logs:', error);
        // Re-add errors to queue for retry
        this.errorQueue.unshift(...errorsToFlush);
      }
    } catch (error) {
      console.error('Failed to flush errors:', error);
      // Re-add errors to queue for retry
      this.errorQueue.unshift(...errorsToFlush);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushErrors();
    }, this.flushInterval);
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logErrorAuto(event.reason, {
        type: 'unhandled-rejection',
        severity: 'high',
        context: {
          promise: event.promise.toString(),
          reason: event.reason?.toString()
        }
      });
    });

    // Handle uncaught errors (though ErrorBoundary should catch most)
    window.addEventListener('error', (event) => {
      this.logErrorAuto(event.error || event.message, {
        type: 'react-error-boundary',
        severity: 'critical',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });
  }

  /**
   * Get error summary for admin dashboard
   */
  async getErrorSummary(days: number = 7): Promise<ErrorSummary | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const errors = data || [];
      const errorsByType: Record<string, number> = {};
      const errorsBySeverity: Record<string, number> = {};
      const errorCounts: Record<string, { count: number; lastOccurred: string }> = {};

      errors.forEach(err => {
        // Count by type
        errorsByType[err.type] = (errorsByType[err.type] || 0) + 1;
        
        // Count by severity
        errorsBySeverity[err.severity] = (errorsBySeverity[err.severity] || 0) + 1;
        
        // Count by error message
        const errorKey = err.error.split('\n')[0]; // Use first line as key
        if (errorCounts[errorKey]) {
          errorCounts[errorKey].count += 1;
          if (new Date(err.created_at!) > new Date(errorCounts[errorKey].lastOccurred)) {
            errorCounts[errorKey].lastOccurred = err.created_at!;
          }
        } else {
          errorCounts[errorKey] = {
            count: 1,
            lastOccurred: err.created_at!
          };
        }
      });

      const mostCommonErrors = Object.entries(errorCounts)
        .map(([error, data]) => ({ error, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        total_errors: errors.length,
        errors_by_type: errorsByType,
        errors_by_severity: errorsBySeverity,
        recent_errors: errors.slice(0, 50),
        most_common_errors
      };
    } catch (error) {
      console.error('Failed to get error summary:', error);
      return null;
    }
  }

  /**
   * Mark error as resolved
   */
  async markErrorResolved(errorId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true })
        .eq('id', errorId);

      return !error;
    } catch (error) {
      console.error('Failed to mark error as resolved:', error);
      return false;
    }
  }

  /**
   * Clear error logs older than specified days
   */
  async clearOldErrors(days: number = 30): Promise<boolean> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { error } = await supabase
        .from('error_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      return !error;
    } catch (error) {
      console.error('Failed to clear old errors:', error);
      return false;
    }
  }

  /**
   * Get errors for a specific user
   */
  async getUserErrors(userId: string, limit: number = 50): Promise<ErrorLog[]> {
    try {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get user errors:', error);
      return [];
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush any remaining errors
    this.flushErrors();
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Export convenience functions
export const logError = (error: Error | string, context?: any) => 
  errorLogger.logErrorAuto(error, context);

export const logApiError = (error: any, url: string, method: string) =>
  errorLogger.logErrorAuto(error, {
    type: 'api-error',
    severity: 'high',
    context: { url, method }
  });

export const logNetworkError = (error: any, url: string) =>
  errorLogger.logErrorAuto(error, {
    type: 'network-error',
    severity: 'medium',
    context: { url }
  });

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  errorLogger.destroy();
});