import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1,
  animate = true
}) => {
  const baseClasses = 'bg-gray-200';
  const animationClass = animate ? 'animate-pulse' : '';
  const combinedClasses = `${baseClasses} ${animationClass} ${className}`.trim();

  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-none';
      case 'rounded':
        return 'rounded-lg';
      case 'text':
      default:
        return 'rounded';
    }
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`${combinedClasses} ${getVariantClasses()}`}
            style={{
              ...style,
              width: index === lines - 1 ? '70%' : '100%', // Last line shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${combinedClasses} ${getVariantClasses()}`}
      style={style}
    />
  );
};

// Predefined skeleton components for common use cases

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm ${className}`}>
    <div className="flex items-center space-x-4 mb-4">
      <LoadingSkeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton variant="text" height={20} width="40%" />
        <LoadingSkeleton variant="text" height={16} width="60%" />
      </div>
    </div>
    <div className="space-y-3">
      <LoadingSkeleton variant="text" lines={3} />
      <div className="flex justify-between items-center pt-2">
        <LoadingSkeleton variant="text" width={80} height={24} />
        <LoadingSkeleton variant="rectangular" width={100} height={36} className="rounded-lg" />
      </div>
    </div>
  </div>
);

export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`space-y-8 ${className}`}>
    {/* Header */}
    <div className="space-y-2">
      <LoadingSkeleton variant="text" height={32} width="30%" />
      <LoadingSkeleton variant="text" height={20} width="50%" />
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <LoadingSkeleton variant="text" height={16} width="60%" />
            <LoadingSkeleton variant="circular" width={48} height={48} />
          </div>
          <LoadingSkeleton variant="text" height={32} width="40%" />
          <LoadingSkeleton variant="text" height={16} width="30%" />
        </div>
      ))}
    </div>

    {/* Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <LoadingSkeleton variant="text" height={24} width="30%" />
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-100">
            <LoadingSkeleton variant="circular" width={32} height={32} />
            <div className="flex-1 space-y-2">
              <LoadingSkeleton variant="text" height={16} width="70%" />
              <LoadingSkeleton variant="text" height={14} width="40%" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="space-y-4">
        <LoadingSkeleton variant="text" height={24} width="40%" />
        {Array.from({ length: 3 }, (_, index) => (
          <CardSkeleton key={index} className="p-4" />
        ))}
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
    {/* Header */}
    <div className="border-b border-gray-200 p-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, index) => (
          <LoadingSkeleton key={index} variant="text" height={20} />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="divide-y divide-gray-200">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <LoadingSkeleton key={colIndex} variant="text" height={16} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({
  fields = 4,
  className = ''
}) => (
  <div className={`space-y-6 ${className}`}>
    {Array.from({ length: fields }, (_, index) => (
      <div key={index} className="space-y-2">
        <LoadingSkeleton variant="text" height={16} width="30%" />
        <LoadingSkeleton variant="rectangular" height={48} className="rounded-lg" />
      </div>
    ))}
    <div className="flex gap-4 pt-4">
      <LoadingSkeleton variant="rectangular" width={120} height={40} className="rounded-lg" />
      <LoadingSkeleton variant="rectangular" width={100} height={40} className="rounded-lg" />
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number; className?: string }> = ({
  items = 5,
  className = ''
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }, (_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-100">
        <LoadingSkeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton variant="text" height={18} width="60%" />
          <LoadingSkeleton variant="text" height={14} width="40%" />
        </div>
        <LoadingSkeleton variant="rectangular" width={80} height={32} className="rounded-lg" />
      </div>
    ))}
  </div>
);

// Loading overlay component
export const LoadingOverlay: React.FC<{ 
  isVisible: boolean; 
  message?: string; 
  className?: string;
}> = ({ isVisible, message = 'Loading...', className = '' }) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-700 font-medium text-center">{message}</p>
        </div>
      </div>
    </div>
  );
};

// Spinner component for inline loading
export const Spinner: React.FC<{ 
  size?: 'sm' | 'md' | 'lg'; 
  className?: string;
  color?: string;
}> = ({ 
  size = 'md', 
  className = '',
  color = 'border-primary'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-200 border-t-${color} ${sizeClasses[size]} ${className}`}
    />
  );
};