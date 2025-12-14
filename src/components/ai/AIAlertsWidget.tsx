import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { AlertTriangle, Bell, CheckCircle, Info, Lightbulb, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  warning: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
};

const typeConfig: Record<string, { icon: typeof Bell; label: string }> = {
  alert: { icon: Bell, label: 'Alert' },
  suggestion: { icon: Lightbulb, label: 'Suggestion' },
  anomaly: { icon: AlertTriangle, label: 'Anomaly' },
};

export function AIAlertsWidget() {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();

  if (loading) {
    return (
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">AI Insights</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-primary/20 text-primary">
              {unreadCount} new
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[280px]">
        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No alerts or suggestions yet</p>
            <p className="text-xs mt-1">AI insights will appear here</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {recentNotifications.map((notification) => {
              const severity = severityConfig[notification.severity as keyof typeof severityConfig] || severityConfig.info;
              const type = typeConfig[notification.notification_type] || typeConfig.alert;
              const SeverityIcon = severity.icon;

              return (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01]',
                    severity.bg,
                    severity.border,
                    !notification.is_read && 'ring-1 ring-primary/20'
                  )}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-1.5 rounded-lg', severity.bg)}>
                      <SeverityIcon className={cn('h-4 w-4', severity.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{notification.title}</span>
                        {!notification.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {type.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
