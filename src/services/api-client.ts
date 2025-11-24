import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, CancelTokenSource, CancelToken } from 'axios';
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
  cancelToken?: CancelTokenSource;
}

export interface RequestConfig extends Omit<AxiosRequestConfig, 'cancelToken'> {
  cancelToken?: CancelToken;
}

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;
  private defaultRetryOptions: RetryOptions;
  private pendingRequests: Map<string, CancelTokenSource>;

  constructor(baseURL: string = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
    this.pendingRequests = new Map();
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
        // Remove from pending requests on success
        const requestKey = this.getRequestKey(response.config);
        this.pendingRequests.delete(requestKey);
        return response;
      },
      (error) => {
        // Remove from pending requests on error
        if (error.config) {
          const requestKey = this.getRequestKey(error.config);
          this.pendingRequests.delete(requestKey);
        }

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

  private getRequestKey(config: AxiosRequestConfig): string {
    return `${config.method?.toUpperCase() || 'GET'}-${config.url}-${JSON.stringify(config.data || {})}`;
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
    const { retry = this.defaultRetryOptions, skipRetry = false, customErrorHandling = false } = options;

    if (skipRetry) {
      // Execute without retry
      try {
        const response = await operation();
        return { data: response.data, status: response.status, attempts: 1 };
      } catch (error) {
        const apiError = this.normalizeError(error);
        if (customErrorHandling) {
          throw apiError;
        }
        return {
          error: apiError.message,
          status: apiError.status || 500,
          attempts: 1
        };
      }
    }

    // Execute with retry
    try {
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
        const apiError = this.normalizeError(result.error);
        if (customErrorHandling) {
          throw apiError;
        }
        return {
          error: apiError.message,
          status: apiError.status || 500,
          attempts: result.attempts
        };
      }
    } catch (error) {
      const apiError = this.normalizeError(error);
      if (customErrorHandling) {
        throw apiError;
      }
      return {
        error: apiError.message,
        status: apiError.status || 500,
        attempts: retry.maxRetries + 1
      };
    }
  }

  private normalizeError(error: unknown): ApiError {
    if (error && typeof error === 'object' && 'message' in error) {
      return error as ApiError;
    }
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500
    };
  }

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('GET', url, undefined, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', url, data, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', url, data, config);
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', url, undefined, config);
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    config?: AxiosRequestConfig & EnhancedApiOptions
  ): Promise<ApiResponse<T>> {
    const { retry, skipRetry, customErrorHandling, timeout, cancelToken, ...axiosConfig } = config || {};
    
    // Cancel existing request if same key exists
    const requestKey = this.getRequestKey({ method, url, data });
    if (this.pendingRequests.has(requestKey)) {
      this.pendingRequests.get(requestKey)?.cancel('Request cancelled due to duplicate');
      this.pendingRequests.delete(requestKey);
    }

    // Create cancel token for this request
    const source = cancelToken || axios.CancelToken.source();
    this.pendingRequests.set(requestKey, source);
    
    const operation = () => {
      const requestConfig: AxiosRequestConfig = {
        ...axiosConfig,
        cancelToken: source.token
      };
      if (timeout) {
        requestConfig.timeout = timeout;
      }
      
      switch (method) {
        case 'GET':
          return this.client.get<T>(url, requestConfig);
        case 'POST':
          return this.client.post<T>(url, data, requestConfig);
        case 'PUT':
          return this.client.put<T>(url, data, requestConfig);
        case 'DELETE':
          return this.client.delete<T>(url, requestConfig);
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    };

    try {
      const result = await this.executeWithRetry<T>(operation, { retry, skipRetry, customErrorHandling });
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
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
    if (!file) {
      return {
        error: 'No file provided',
        status: 400,
        attempts: 1
      };
    }

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
    if (!requests || requests.length === 0) {
      return [];
    }

    const { skipRetry = true, retry, customErrorHandling, timeout, cancelToken, ...axiosConfig } = config || {}; // Usually don't retry batch operations

    const promises = requests.map(request => {
      if (!request.url) {
        return Promise.resolve({
          error: 'URL is required for batch requests',
          status: 400,
          attempts: 1
        } as ApiResponse<T>);
      }

      const requestConfig: RequestConfig & Omit<EnhancedApiOptions, 'cancelToken'> = {
        ...axiosConfig,
        skipRetry,
        retry,
        customErrorHandling,
        timeout,
        cancelToken: cancelToken?.token
      };

      switch (request.method) {
        case 'GET':
          return this.get(request.url, requestConfig as AxiosRequestConfig & EnhancedApiOptions);
        case 'POST':
          return this.post(request.url, request.data, requestConfig as AxiosRequestConfig & EnhancedApiOptions);
        case 'PUT':
          return this.put(request.url, request.data, requestConfig as AxiosRequestConfig & EnhancedApiOptions);
        case 'DELETE':
          return this.delete(request.url, requestConfig as AxiosRequestConfig & EnhancedApiOptions);
        default:
          return Promise.resolve({
            error: `Unsupported method: ${request.method}`,
            status: 405,
            attempts: 1
          } as ApiResponse<T>);
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
    } catch (error) {
      console.warn('Health check failed:', error);
      return false;
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.pendingRequests.forEach((source) => {
      source.cancel('Request cancelled');
    });
    this.pendingRequests.clear();
  }

  /**
   * Cancel specific request
   */
  cancelRequest(method: string, url: string, data?: any): void {
    const requestKey = this.getRequestKey({ method: method.toUpperCase() as any, url, data });
    const source = this.pendingRequests.get(requestKey);
    if (source) {
      source.cancel('Request cancelled');
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * Get count of pending requests
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
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