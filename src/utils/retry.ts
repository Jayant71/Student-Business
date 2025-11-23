export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
  shouldResetTimeout?: boolean;
}

export interface RetryResult<T> {
  data: T | null;
  error: any;
  attempts: number;
  succeeded: boolean;
}

/**
 * Retry mechanism with exponential backoff
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition,
    onRetry,
    shouldResetTimeout = true
  } = options;

  let lastError: any;
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      attempts++;
      
      if (shouldResetTimeout && attempts > 1) {
        // Reset any connection timeout before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const result = await operation();
      
      return {
        data: result,
        error: null,
        attempts,
        succeeded: true
      };
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!retryCondition(error) || attempts > maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempts - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitter = delay * 0.1 * Math.random();
      const finalDelay = delay + jitter;

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempts, error);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }

  return {
    data: null,
    error: lastError,
    attempts,
    succeeded: false
  };
};

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
export const defaultRetryCondition = (error: any): boolean => {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  // HTTP status codes that should be retried
  const retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
    507, // Insufficient Storage
    509, // Bandwidth Limit Exceeded
    520, // Unknown Error
    521, // Web Server Is Down
    522, // Connection Timed Out
    523, // Origin Is Unreachable
    524, // A Timeout Occurred
  ];

  return retryableStatusCodes.includes(error.response.status);
};

/**
 * Retry condition for specific status codes
 */
export const createRetryCondition = (statusCodes: number[]) => {
  return (error: any): boolean => {
    if (!error.response) return true; // Network errors
    return statusCodes.includes(error.response.status);
  };
};

/**
 * Retry condition for specific error messages
 */
export const createMessageRetryCondition = (messages: string[]) => {
  return (error: any): boolean => {
    const errorMessage = error?.message || '';
    return messages.some(message => 
      errorMessage.toLowerCase().includes(message.toLowerCase())
    );
  };
};

/**
 * Combined retry condition - retries if ANY condition is met
 */
export const combineRetryConditions = (...conditions: ((error: any) => boolean)[]) => {
  return (error: any): boolean => {
    return conditions.some(condition => condition(error));
  };
};

/**
 * Class-based retry manager for more complex scenarios
 */
export class RetryManager {
  private static instance: RetryManager;
  private retryAttempts = new Map<string, number>();
  private lastRetryTime = new Map<string, number>();

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * Execute operation with retry and cooldown period
   */
  async executeWithCooldown<T>(
    key: string,
    operation: () => Promise<T>,
    options: RetryOptions & { cooldownPeriod?: number } = {}
  ): Promise<RetryResult<T>> {
    const { cooldownPeriod = 60000, ...retryOptions } = options; // 1 minute default cooldown

    // Check if we're in cooldown period
    const lastRetry = this.lastRetryTime.get(key);
    if (lastRetry && Date.now() - lastRetry < cooldownPeriod) {
      const attempts = this.retryAttempts.get(key) || 0;
      return {
        data: null,
        error: new Error(`Operation in cooldown period. Last retry: ${new Date(lastRetry).toISOString()}`),
        attempts,
        succeeded: false
      };
    }

    const result = await retryWithBackoff(operation, {
      ...retryOptions,
      onRetry: (attempt, error) => {
        this.retryAttempts.set(key, attempt);
        this.lastRetryTime.set(key, Date.now());
        retryOptions.onRetry?.(attempt, error);
      }
    });

    if (result.succeeded) {
      // Reset counters on success
      this.retryAttempts.delete(key);
      this.lastRetryTime.delete(key);
    }

    return result;
  }

  /**
   * Get retry statistics for a key
   */
  getStats(key: string) {
    return {
      attempts: this.retryAttempts.get(key) || 0,
      lastRetry: this.lastRetryTime.get(key) || null
    };
  }

  /**
   * Clear retry history for a key
   */
  clearHistory(key: string) {
    this.retryAttempts.delete(key);
    this.lastRetryTime.delete(key);
  }

  /**
   * Clear all retry history
   */
  clearAllHistory() {
    this.retryAttempts.clear();
    this.lastRetryTime.clear();
  }
}

/**
 * Higher-order function that adds retry capability to any async function
 */
export const withRetry = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) => {
  return async (...args: T): Promise<RetryResult<R>> => {
    return retryWithBackoff(() => fn(...args), options);
  };
};

/**
 * Decorator for adding retry to class methods
 */
export function retryable(options: RetryOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retryWithBackoff(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Utility function to create adaptive retry options based on error type
 */
export const createAdaptiveRetryOptions = (error: any): RetryOptions => {
  // Rate limited errors - longer delays
  if (error?.response?.status === 429) {
    return {
      maxRetries: 5,
      initialDelay: 5000,
      maxDelay: 60000,
      backoffFactor: 2.5
    };
  }

  // Timeout errors - moderate delays
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      backoffFactor: 1.5
    };
  }

  // Network errors - shorter delays, more retries
  if (!error?.response) {
    return {
      maxRetries: 4,
      initialDelay: 1000,
      maxDelay: 8000,
      backoffFactor: 1.8
    };
  }

  // Default options
  return {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2
  };
};