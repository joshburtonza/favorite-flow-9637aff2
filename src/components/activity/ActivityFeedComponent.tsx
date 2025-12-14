import { useActivityFeed } from '@/hooks/useActivityFeed';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Users, Building2, CreditCard, FileText, User, Shield, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const actionIcons: Record<string, string> = {
  create: '➕',
  update: '✏️',
  delete: '🗑️',
  view: '👁️',
  export: '📤',
  import: '📥',
  login: '🔓',
  logout: '🔒',
};

const entityIcons: Record<string, typeof Package> = {
  shipment: Package,
  supplier: Users,
  client: Building2,
  payment: CreditCard,
  document: FileText,
  user: User,
  role: Shield,
  permission: Shield,
  bank_account: Settings,
  system: Settings,
};

const actionColors: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400 border-green-500/30',
  update: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  view: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  export: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  import: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  login: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  logout: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

export function ActivityFeedComponent({ limit = 50, showHeader = true, compact = false }: ActivityFeedProps) {
  const { activities, loading } = useActivityFeed(limit);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const content = (
    <ScrollArea className={compact ? 'h-[300px]' : 'h-[500px]'}>
      <div className="space-y-2 pr-4">
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No activities recorded yet</p>
        ) : (
          activities.map((activity) => {
            const EntityIcon = entityIcons[activity.entity_type] || Package;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <EntityIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${actionColors[activity.action_type] || ''}`}
                    >
                      {actionIcons[activity.action_type] || '📝'} {activity.action_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm mt-1 truncate">{activity.description}</p>
                  {activity.user_email && (
                    <p className="text-xs text-muted-foreground mt-1">
                      by {activity.user_email}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          📝 Activity Feed
        </CardTitle>
        <CardDescription>
          Real-time log of all system activities
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
