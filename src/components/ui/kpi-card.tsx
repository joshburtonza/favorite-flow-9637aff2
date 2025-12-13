import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  compact?: boolean;
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  trend,
  className,
  compact = false
}: KPICardProps) {
  if (compact) {
    return (
      <div className={cn(
        'glass-card p-4',
        className
      )}>
        <div className="flex items-center gap-3">
          <div 
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'hsl(var(--primary) / 0.2)' }}
          >
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate uppercase tracking-wider">{title}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
          {trend && (
            <span className={cn(
              'trend-badge',
              trend.isPositive ? 'trend-up' : 'trend-danger'
            )}>
              {trend.isPositive ? '↑' : '↓'}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('glass-card', className)}>
      <div className="card-label">
        <Icon className="h-4 w-4 text-accent" />
        {title}
      </div>
      <div className="big-number">{value}</div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {trend && (
        <span className={cn(
          'trend-badge mt-2',
          trend.isPositive ? 'trend-up' : 'trend-danger'
        )}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </span>
      )}
    </div>
  );
}
