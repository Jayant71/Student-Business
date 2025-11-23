import { useState, useCallback, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

export interface LoadingActions {
  setLoading: (loading: boolean, message?: string) => void;
  setProgress: (progress: number) => void;
  withLoading: <T>(operation: () => Promise<T>, message?: string) => Promise<T>;
  reset: () => void;
}

export const useLoadingState = (initialMessage?: string): LoadingState & LoadingActions => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(initialMessage);
  const [progress, setProgress] = useState<number | undefined>();

  const setLoading = useCallback((loading: boolean, message?: string) => {
    setIsLoading(loading);
    if (message) {
      setLoadingMessage(message);
    }
    if (!loading) {
      setProgress(undefined);
    }
  }, []);

  const withLoading = useCallback(async <T,>(
    operation: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    try {
      setLoading(true, message);
      const result = await operation();
      return result;
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(initialMessage);
    setProgress(undefined);
  }, [initialMessage]);

  return {
    isLoading,
    loadingMessage,
    progress,
    setLoading,
    setProgress,
    withLoading,
    reset
  };
};

// Hook for managing multiple loading states
export interface LoadingGroup {
  [key: string]: LoadingState;
}

export interface LoadingGroupActions {
  setLoading: (key: string, loading: boolean, message?: string) => void;
  setProgress: (key: string, progress: number) => void;
  withLoading: <T>(key: string, operation: () => Promise<T>, message?: string) => Promise<T>;
  isAnyLoading: () => boolean;
  getLoadingKeys: () => string[];
  reset: (key?: string) => void;
  resetAll: () => void;
}

export const useLoadingGroup = (keys: string[]): LoadingGroup & LoadingGroupActions => {
  const [loadingStates, setLoadingStates] = useState<LoadingGroup>(() => {
    const initial: LoadingGroup = {};
    keys.forEach(key => {
      initial[key] = { isLoading: false };
    });
    return initial;
  });

  const setLoading = useCallback((key: string, loading: boolean, message?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: loading,
        loadingMessage: loading ? message : prev[key].loadingMessage,
        progress: loading ? prev[key].progress : undefined
      }
    }));
  }, []);

  const setProgress = useCallback((key: string, progress: number) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        progress
      }
    }));
  }, []);

  const withLoading = useCallback(async <T,>(
    key: string,
    operation: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    try {
      setLoading(key, true, message);
      const result = await operation();
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(state => state.isLoading);
  }, [loadingStates]);

  const getLoadingKeys = useCallback(() => {
    return Object.entries(loadingStates)
      .filter(([_, state]) => state.isLoading)
      .map(([key]) => key);
  }, [loadingStates]);

  const reset = useCallback((key?: string) => {
    if (key) {
      setLoadingStates(prev => ({
        ...prev,
        [key]: { isLoading: false, loadingMessage: undefined, progress: undefined }
      }));
    }
  }, []);

  const resetAll = useCallback(() => {
    const resetStates: LoadingGroup = {};
    keys.forEach(key => {
      resetStates[key] = { isLoading: false };
    });
    setLoadingStates(resetStates);
  }, [keys]);

  return {
    ...loadingStates,
    setLoading,
    setProgress,
    withLoading,
    isAnyLoading,
    getLoadingKeys,
    reset,
    resetAll
  };
};

// Hook for managing loading states with timeout
export const useLoadingWithTimeout = (
  timeoutMs: number = 30000,
  initialMessage?: string
): LoadingState & LoadingActions & { hasTimedOut: boolean } => {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const loadingState = useLoadingState(initialMessage);

  const setLoading = useCallback((loading: boolean, message?: string) => {
    loadingState.setLoading(loading, message);
    setHasTimedOut(false);
  }, [loadingState]);

  const withLoading = useCallback(async <T,>(
    operation: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    let timeoutId: NodeJS.Timeout;

    try {
      setLoading(true, message);
      
      // Set timeout
      timeoutId = setTimeout(() => {
        setHasTimedOut(true);
        setLoading(false);
      }, timeoutMs);

      const result = await operation();
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [setLoading, timeoutMs]);

  return {
    ...loadingState,
    setLoading,
    withLoading,
    hasTimedOut,
    reset: () => {
      loadingState.reset();
      setHasTimedOut(false);
    }
  };
};

// Hook for managing sequential loading states
export const useSequentialLoading = (
  steps: Array<{ key: string; message?: string }>
): LoadingState & LoadingActions & { currentStep: number; completedSteps: string[] } => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const loadingState = useLoadingState();

  const executeSequentially = useCallback(async <T,>(
    operations: Array<() => Promise<T>>
  ): Promise<T[]> => {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      const step = steps[i];
      setCurrentStep(i);
      loadingState.setLoading(true, step.message);
      
      try {
        const result = await operations[i]();
        results.push(result);
        setCompletedSteps(prev => [...prev, step.key]);
      } catch (error) {
        loadingState.setLoading(false);
        throw error;
      }
    }
    
    loadingState.setLoading(false);
    setCurrentStep(0);
    
    return results;
  }, [steps, loadingState]);

  const reset = useCallback(() => {
    loadingState.reset();
    setCurrentStep(0);
    setCompletedSteps([]);
  }, [loadingState]);

  return {
    ...loadingState,
    withLoading: loadingState.withLoading,
    executeSequentially,
    currentStep,
    completedSteps,
    reset
  };
};

// Utility hook for debounced loading
export const useDebouncedLoading = (
  delayMs: number = 300
): LoadingState & LoadingActions => {
  const loadingState = useLoadingState();
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const setLoading = useCallback((loading: boolean, message?: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    if (loading) {
      const id = setTimeout(() => {
        loadingState.setLoading(true, message);
        setTimeoutId(null);
      }, delayMs);
      setTimeoutId(id);
    } else {
      loadingState.setLoading(false);
    }
  }, [loadingState, delayMs, timeoutId]);

  const reset = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    loadingState.reset();
  }, [loadingState, timeoutId]);

  return {
    ...loadingState,
    setLoading,
    withLoading: loadingState.withLoading,
    reset
  };
};