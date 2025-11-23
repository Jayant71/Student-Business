import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
  showSuccess: (title: string, message?: string) => string;
  showError: (title: string, message?: string) => string;
  showWarning: (title: string, message?: string) => string;
  showInfo: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  defaultDuration = 5000
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = {
      id,
      duration: defaultDuration,
      ...toast
    };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Limit the number of toasts
      return updated.slice(-maxToasts);
    });

    // Auto-hide toast after duration (unless persistent)
    if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }

    return id;
  }, [defaultDuration, maxToasts]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    return showToast({ type: 'success', title, message });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    return showToast({ type: 'error', title, message, duration: 8000 }); // Errors stay longer
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    return showToast({ type: 'warning', title, message });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    return showToast({ type: 'info', title, message });
  }, [showToast]);

  const value: ToastContextType = {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast container component
const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
};

// Individual toast item component
const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'info':
      default:
        return <Info size={20} className="text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTitleColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };

  const getMessageColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div
      className={`
        ${getBgColor()}
        border rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out
        animate-in slide-in-from-right-full
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${getTitleColor()}`}>
            {toast.title}
          </h3>
          
          {toast.message && (
            <p className={`mt-1 text-sm ${getMessageColor()}`}>
              {toast.message}
            </p>
          )}
          
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
              style={{
                color: toast.type === 'success' ? '#059669' : 
                       toast.type === 'error' ? '#dc2626' : 
                       toast.type === 'warning' ? '#d97706' : '#2563eb'
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook for toast with auto-error handling
export const useToastWithErrorHandling = () => {
  const toast = useToast();

  const withErrorHandling = async <T,>(
    operation: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorTitle?: string;
      showLoadingToast?: boolean;
    }
  ): Promise<T | null> => {
    const {
      successMessage,
      errorTitle = 'Operation failed',
      showLoadingToast = false
    } = options || {};

    let loadingToastId: string | undefined;

    try {
      if (showLoadingToast) {
        loadingToastId = toast.showInfo('Processing...', 'Please wait');
      }

      const result = await operation();

      if (loadingToastId) {
        toast.hideToast(loadingToastId);
      }

      if (successMessage) {
        toast.showSuccess('Success', successMessage);
      }

      return result;
    } catch (error) {
      if (loadingToastId) {
        toast.hideToast(loadingToastId);
      }

      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.showError(errorTitle, errorMessage);
      
      console.error('Operation failed:', error);
      return null;
    }
  };

  return {
    ...toast,
    withErrorHandling
  };
};