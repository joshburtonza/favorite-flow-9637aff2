import { useProactiveAlerts } from '@/hooks/useProactiveAlerts';
import { AlertTriangle, Bell, CheckCircle, Info, Lightbulb, X, Clock, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const severityConfig = {
  critical: { icon: Zap, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  urgent: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
};

const typeConfig: Record<string, { icon: typeof Bell; label: string }> = {
  high_supplier_balance: { icon: AlertTriangle, label: 'Balance' },
  overdue_telex: { icon: Clock, label: 'Telex' },
  payment_due_soon: { icon: Bell, label: 'Payment' },
  low_margin_shipment: { icon: AlertTriangle, label: 'Margin' },
  stale_shipment: { icon: Clock, label: 'Stale' },
  missing_client_invoice: { icon: Bell, label: 'Invoice' },
  alert: { icon: Bell, label: 'Alert' },
  suggestion: { icon: Lightbulb, label: 'Suggestion' },
  anomaly: { icon: AlertTriangle, label: 'Anomaly' },
};

export function AIAlertsWidget() {
  const { alerts, loading, activeCount, urgentCount, acknowledgeAlert, resolveAlert, dismissAlert } = useProactiveAlerts();

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

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Proactive Alerts</h3>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-primary/20 text-primary">
              {activeCount} active
            </Badge>
          )}
          {urgentCount > 0 && (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              {urgentCount} urgent
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="h-[280px]">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-50" />
            <p className="text-sm font-medium">All clear!</p>
            <p className="text-xs mt-1">No active alerts or issues</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {alerts.slice(0, 10).map((alert) => {
              const severity = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.info;
              const type = typeConfig[alert.alert_type] || typeConfig.alert;
              const SeverityIcon = severity.icon;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    'p-3 rounded-xl border transition-all',
                    severity.bg,
                    severity.border,
                    alert.status === 'active' && 'ring-1 ring-primary/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-1.5 rounded-lg shrink-0', severity.bg)}>
                      <SeverityIcon className={cn('h-4 w-4', severity.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{alert.title}</span>
                        {alert.status === 'active' && alert.action_required && (
                          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {alert.message}
                      </p>
                      {alert.suggested_action && (
                        <p className="text-xs text-primary/80 mt-1 italic">
                          💡 {alert.suggested_action}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {type.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {alert.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Ack
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-emerald-600"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
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