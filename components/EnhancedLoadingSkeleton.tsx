/**
 * Enhanced Loading States with Micro-interactions
 * Beautiful, accessible loading states for all app components
 */
import { ReactNode, useEffect, useState } from 'react';
import { Camera, Brain, Image, Sparkles } from 'lucide-react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'image' | 'button' | 'chat' | 'analysis';
  lines?: number;
  className?: string;
  animate?: boolean;
  showIcon?: boolean;
  message?: string;
  progress?: number;
  children?: ReactNode;
}

export function LoadingSkeleton({ 
  variant = 'card',
  lines = 3,
  className = '',
  animate = true,
  showIcon = false,
  message,
  progress,
  children
}: LoadingSkeletonProps) {
  const baseClasses = animate 
    ? 'bg-gradient-to-r from-stone-200 via-stone-300 to-stone-200 dark:from-stone-700 dark:via-stone-600 dark:to-stone-700 animate-pulse bg-[length:200%_100%]'
    : 'bg-stone-200 dark:bg-stone-700';

  // Shimmer animation for enhanced loading
  const shimmerClasses = animate 
    ? 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent'
    : '';

  switch (variant) {
    case 'text':
      return (
        <div className={`space-y-3 ${className}`}>
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className={`h-4 rounded-lg ${baseClasses} ${shimmerClasses}`}
              style={{ 
                width: i === lines - 1 ? '75%' : '100%',
                animationDelay: `${i * 0.1}s` 
              }}
            />
          ))}
        </div>
      );

    case 'image':
      return (
        <div className={`${className}`}>
          <div className={`aspect-video rounded-xl ${baseClasses} ${shimmerClasses} flex items-center justify-center`}>
            {showIcon && <Image className="w-12 h-12 text-stone-400 dark:text-stone-500" />}
          </div>
          {message && (
            <p className="mt-3 text-sm text-stone-500 dark:text-stone-400 text-center animate-pulse">
              {message}
            </p>
          )}
          {progress !== undefined && (
            <div className="mt-3">
              <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 text-center mt-1">
                {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>
      );

    case 'button':
      return (
        <div className={`${baseClasses} ${shimmerClasses} h-11 rounded-lg ${className}`} />
      );

    case 'chat':
      return (
        <div className={`space-y-4 ${className}`}>
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className={`flex gap-3 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <div className={`max-w-xs ${i % 2 === 0 ? 'order-2' : 'order-1'}`}>
                <div className={`h-12 rounded-2xl ${baseClasses} ${shimmerClasses}`} />
              </div>
              {i % 2 === 0 && (
                <div className={`w-8 h-8 rounded-full ${baseClasses} ${shimmerClasses} order-1 flex-shrink-0`} />
              )}
            </div>
          ))}
        </div>
      );

    case 'analysis':
      return (
        <div className={`space-y-6 ${className}`}>
          {/* Header */}
          <div className="space-y-3">
            <div className={`h-8 w-3/4 rounded-lg ${baseClasses} ${shimmerClasses}`} />
            <div className={`h-4 w-full rounded-lg ${baseClasses} ${shimmerClasses}`} />
            <div className={`h-4 w-5/6 rounded-lg ${baseClasses} ${shimmerClasses}`} />
          </div>

          {/* Sections */}
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-3" style={{ animationDelay: `${i * 0.3}s` }}>
              <div className={`h-6 w-1/2 rounded-lg ${baseClasses} ${shimmerClasses}`} />
              <div className="space-y-2">
                <div className={`h-4 w-full rounded-lg ${baseClasses} ${shimmerClasses}`} />
                <div className={`h-4 w-4/5 rounded-lg ${baseClasses} ${shimmerClasses}`} />
              </div>
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <div className={`h-11 w-32 rounded-lg ${baseClasses} ${shimmerClasses}`} />
            <div className={`h-11 w-24 rounded-lg ${baseClasses} ${shimmerClasses}`} />
          </div>
        </div>
      );

    default: // card
      return (
        <div className={`${className}`}>
          <div className={`p-6 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4`}>
            <div className={`h-6 w-1/3 rounded-lg ${baseClasses} ${shimmerClasses}`} />
            <div className="space-y-3">
              {Array.from({ length: lines }, (_, i) => (
                <div
                  key={i}
                  className={`h-4 rounded-lg ${baseClasses} ${shimmerClasses}`}
                  style={{ 
                    width: i === lines - 1 ? '60%' : '100%',
                    animationDelay: `${i * 0.1}s` 
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      );
  }
}

// Specialized loading components for different features
interface AnalysisLoadingProps {
  stage: 'uploading' | 'processing' | 'analyzing' | 'generating' | 'visualizing';
  progress?: number;
  className?: string;
}

export function AnalysisLoading({ stage, progress = 0, className = '' }: AnalysisLoadingProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const stageConfig = {
    uploading: {
      icon: Camera,
      message: 'Uploading image',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    },
    processing: {
      icon: Image,
      message: 'Processing image',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    },
    analyzing: {
      icon: Brain,
      message: 'Analyzing room layout',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
    generating: {
      icon: Sparkles,
      message: 'Generating insights',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    },
    visualizing: {
      icon: Sparkles,
      message: 'Rendering your designs',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    },
  };

  const config = stageConfig[stage];
  const Icon = config.icon;

  return (
    <div className={`text-center space-y-6 ${className}`}>
      {/* Animated Icon */}
      <div className={`mx-auto w-20 h-20 rounded-full ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-10 h-10 ${config.color} animate-pulse`} />
      </div>

      {/* Stage Message */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          {config.message}{dots}
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          This may take a few moments
        </p>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="w-full max-w-xs mx-auto">
          <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${
                stage === 'uploading' ? 'from-blue-400 to-blue-500' :
                stage === 'processing' ? 'from-purple-400 to-purple-500' :
                stage === 'analyzing' ? 'from-emerald-400 to-emerald-500' :
                'from-amber-400 to-amber-500'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 text-center mt-1">
            {Math.round(progress)}%
          </p>
        </div>
      )}

      {/* Breathing animation for the container */}
    </div>
  );
}

// Chat typing indicator
export function ChatTypingIndicator({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 p-4 ${className}`}>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-stone-400 dark:bg-stone-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <span className="text-sm text-stone-500 dark:text-stone-400">
        AI is thinking...
      </span>
    </div>
  );
}

// Button loading state
interface LoadingButtonProps {
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

export function LoadingButton({
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  onClick,
  type = 'button',
}: LoadingButtonProps) {
  const baseClasses = 'relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
    secondary: 'bg-stone-600 hover:bg-stone-700 text-white focus:ring-stone-500',
    ghost: 'bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 focus:ring-stone-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <span className={loading ? 'invisible' : 'visible'}>
        {children}
      </span>
    </button>
  );
}

// Image loading with fade-in
export function FadeInImage({ 
  src, 
  alt, 
  className = '', 
  onLoad,
  ...props 
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setLoaded(true);
    onLoad?.(e);
  };

  const handleError = () => {
    setError(true);
  };

  if (error) {
    return (
      <div className={`bg-stone-100 dark:bg-stone-800 flex items-center justify-center ${className}`}>
        <Image className="w-8 h-8 text-stone-400 dark:text-stone-500" />
      </div>
    );
  }

  return (
    <div className="relative">
      {!loaded && (
        <div className={`absolute inset-0 bg-stone-200 dark:bg-stone-700 animate-pulse ${className}`} />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        {...props}
      />
    </div>
  );
}

// Add shimmer keyframe to global styles
export const shimmerCSS = `
  @keyframes shimmer {
    100% {
      transform: translateX(100%);
    }
  }
`;