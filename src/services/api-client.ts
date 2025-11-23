import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { supabase } from '../lib/supabase';
import { retryWithBackoff, RetryOptions, defaultRetryCondition } from '../utils/retry';
import { logApiError, logNetworkError } from './error-logger';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  attempts?: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  config?: AxiosRequestConfig;
  response?: any;
}

export interface EnhancedApiOptions {
  retry?: RetryOptions;
  skipRetry?: boolean;
  customErrorHandling?: boolean;
  timeout?: number;
}

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private defaultRetryOptions: RetryOptions;

  constructor(baseURL: string = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.defaultRetryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryCondition: defaultRetryCondition,
    };

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and logging
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        const apiError: ApiError = {
          message: error.response?.data?.error || error.message || 'An unexpected error occurred',
          status: error.response?.status,
          code: error.code,
          config: error.config,
          response: error.response,
        };
        
        // Log error to service
        this.logApiError(apiError, error.config);
        
        console.error('API Error:', apiError);
        return Promise.reject(apiError);
      }
    );
  }

  private logApiError(error: ApiError, config?: AxiosRequestConfig): void {
    const url = config?.url || 'unknown';
    const method = config?.method?.toUpperCase() || 'unknown';
    
    // Don't log in development for certain errors
    if (import.meta.env.DEV && error.status === 404) {
      return;
    }

    logApiError(error, url, method);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<T>>,
    options: EnhancedApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const { retry = this.defaultRetryOptions, skipRetry = false } = options;

    if (skipRetry) {
      // Execute without retry
      try {
        const response = await operation();
        return { data: response.data, status: response.status, attempts: 1 };
      } catch (error) {
        const apiError = error as ApiError;
        return {
          error: apiError.message,
          status: apiError.status || 500,
          attempts: 1
        };
      }
    }

    // Execute with retry
    const result = await retryWithBackoff(operation, {
      ...retry,
      onRetry: (attempt, error) => {
        console.warn(`API request retry attempt ${attempt}:`, error.message);
        retry.onRetry?.(attempt, error);
      }
    });

    if (result.succeeded && result.data) {
      return {
        data: result.data.data,
        status: result.data.status,
        attempts: result.attempts
      };
    } else {
      const apiError = result.error as ApiError;
      return {
        error: apiError.message,
        status: apiError.status || 500,
        attempts: result.attempts
      };
    }
  }

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    const { retry, skipRetry, customErrorHandling, timeout, ...axiosConfig } = config || {};
    
    const operation = () => {
      const requestConfig = { ...axiosConfig };
      if (timeout) requestConfig.timeout = timeout;
      return this.client.get<T>(url, requestConfig);
    };

    return this.executeWithRetry(operation, { retry, skipRetry, customErrorHandling });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    const { retry, skipRetry, customErrorHandling, timeout, ...axiosConfig } = config || {};
    
    const operation = () => {
      const requestConfig = { ...axiosConfig };
      if (timeout) requestConfig.timeout = timeout;
      return this.client.post<T>(url, data, requestConfig);
    };

    return this.executeWithRetry(operation, { retry, skipRetry, customErrorHandling });
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    const { retry, skipRetry, customErrorHandling, timeout, ...axiosConfig } = config || {};
    
    const operation = () => {
      const requestConfig = { ...axiosConfig };
      if (timeout) requestConfig.timeout = timeout;
      return this.client.put<T>(url, data, requestConfig);
    };

    return this.executeWithRetry(operation, { retry, skipRetry, customErrorHandling });
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    const { retry, skipRetry, customErrorHandling, timeout, ...axiosConfig } = config || {};
    
    const operation = () => {
      const requestConfig = { ...axiosConfig };
      if (timeout) requestConfig.timeout = timeout;
      return this.client.delete<T>(url, requestConfig);
    };

    return this.executeWithRetry(operation, { retry, skipRetry, customErrorHandling });
  }

  // Utility methods for common patterns

  /**
   * Upload file with progress tracking
   */
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const { retry = { maxRetries: 2, initialDelay: 2000 }, skipRetry = false, ...axiosConfig } = config || {};

    const operation = () => this.client.post<T>(url, formData, {
      ...axiosConfig,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...axiosConfig.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return this.executeWithRetry(operation, { retry, skipRetry });
  }

  /**
   * Batch requests
   */
  async batch<T = any>(
    requests: Array<{ method: 'GET' | 'POST' | 'PUT' | 'DELETE'; url: string; data?: any }>,
    config?: EnhancedApiOptions
  ): Promise<ApiResponse<T>[]> {
    const { skipRetry = true } = config || {}; // Usually don't retry batch operations

    const promises = requests.map(request => {
      switch (request.method) {
        case 'GET':
          return this.get(request.url, { ...config, skipRetry });
        case 'POST':
          return this.post(request.url, request.data, { ...config, skipRetry });
        case 'PUT':
          return this.put(request.url, request.data, { ...config, skipRetry });
        case 'DELETE':
          return this.delete(request.url, { ...config, skipRetry });
        default:
          return Promise.reject(new Error(`Unsupported method: ${request.method}`));
      }
    });

    return Promise.all(promises);
  }

  /**
   * Health check for API availability
   */
  async healthCheck(url: string = '/health'): Promise<boolean> {
    try {
      const result = await this.get(url, {
        skipRetry: true,
        timeout: 5000
      });
      return result.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Set default retry options
   */
  setDefaultRetryOptions(options: Partial<RetryOptions>): void {
    this.defaultRetryOptions = { ...this.defaultRetryOptions, ...options };
  }

  /**
   * Get current retry options
   */
  getDefaultRetryOptions(): RetryOptions {
    return { ...this.defaultRetryOptions };
  }
}

export const apiClient = new ApiClient();