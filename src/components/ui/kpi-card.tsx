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
        'flex items-center gap-3 p-3 rounded-xl bg-card border border-border',
        className
      )}>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-lg font-bold text-foreground">{value}</p>
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded',
            trend.isPositive ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
          )}>
            {trend.isPositive ? '↑' : '↓'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('kpi-card', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-foreground">{value}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
          {trend && (
            <p className={cn(
              'text-sm font-medium mt-1',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}