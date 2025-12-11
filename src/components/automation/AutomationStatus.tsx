import { useAutomationLogs, useAutomationLogsList } from '@/hooks/useAutomationLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Mail, 
  Activity,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function AutomationStatus() {
  const { data: stats, isLoading } = useAutomationLogs();
  const { data: logs } = useAutomationLogsList();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const successRate = stats?.totalToday ? 
    Math.round((stats.successToday / stats.totalToday) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Messages Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalToday || 0}</div>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {stats?.successToday || 0} success
              </span>
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {stats?.failedToday || 0} failed
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              Last WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.lastWhatsApp ? (
              <>
                <div className="text-lg font-semibold truncate">
                  {stats.lastWhatsApp.action.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.lastWhatsApp.lot_number && `LOT ${stats.lastWhatsApp.lot_number} • `}
                  {formatDistanceToNow(new Date(stats.lastWhatsApp.created_at), { addSuffix: true })}
                </div>
                <Badge variant={stats.lastWhatsApp.success ? "default" : "destructive"} className="mt-2">
                  {stats.lastWhatsApp.success ? 'Success' : 'Failed'}
                </Badge>
              </>
            ) : (
              <div className="text-muted-foreground">No messages yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              Last Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.lastEmail ? (
              <>
                <div className="text-lg font-semibold truncate">
                  {stats.lastEmail.action.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.lastEmail.lot_number && `LOT ${stats.lastEmail.lot_number} • `}
                  {formatDistanceToNow(new Date(stats.lastEmail.created_at), { addSuffix: true })}
                </div>
                <Badge variant={stats.lastEmail.success ? "default" : "destructive"} className="mt-2">
                  {stats.lastEmail.success ? 'Success' : 'Failed'}
                </Badge>
              </>
            ) : (
              <div className="text-muted-foreground">No emails yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Status</CardTitle>
          <CardDescription>n8n integration connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${successRate >= 80 ? 'bg-green-500' : successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              {successRate >= 80 ? 'Connected' : successRate >= 50 ? 'Degraded' : 'Issues Detected'}
            </span>
            <span className="text-sm text-muted-foreground">
              ({successRate}% success rate today)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Failed Automations */}
      {stats?.recentFailed && stats.recentFailed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Recent Failed Automations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentFailed.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-destructive/5 rounded-lg">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                      {log.lot_number && (
                        <Badge variant="outline" className="text-xs">LOT {log.lot_number}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{log.error}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Activity
          </CardTitle>
          <CardDescription>Last 50 automation events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs?.map((log) => (
              <div 
                key={log.id} 
                className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md text-sm"
              >
                {log.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                )}
                <Badge variant="outline" className="shrink-0">
                  {log.source === 'whatsapp' ? '💬' : log.source === 'email' ? '📧' : '✏️'} {log.source}
                </Badge>
                <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                {log.lot_number && (
                  <span className="text-muted-foreground">LOT {log.lot_number}</span>
                )}
                <span className="text-muted-foreground ml-auto shrink-0">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No automation activity yet. Connect n8n to start automating!
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
