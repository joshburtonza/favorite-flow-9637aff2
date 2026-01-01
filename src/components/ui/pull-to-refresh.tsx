import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useIsMobile } from '@/hooks/use-mobile';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const isMobile = useIsMobile();
  const { containerRef, isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh,
    disabled: disabled || !isMobile,
  });

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{ 
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      {/* Pull indicator */}
      {isMobile && (
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-50 transition-opacity duration-200',
            pullDistance > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            top: Math.max(pullDistance - 40, 8),
          }}
        >
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full',
            'bg-primary/10 backdrop-blur-sm border border-primary/20',
            'shadow-lg'
          )}>
            <RefreshCw
              className={cn(
                'h-5 w-5 text-primary transition-transform duration-200',
                isRefreshing && 'animate-spin'
              )}
              style={{
                transform: isRefreshing 
                  ? undefined 
                  : `rotate(${progress * 360}deg)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Content with transform for pull effect */}
      <div
        style={{
          transform: isMobile && pullDistance > 0 
            ? `translateY(${pullDistance}px)` 
            : undefined,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
