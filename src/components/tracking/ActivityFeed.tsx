import { useActivityFeed } from '@/hooks/useActivityFeed';
import { Activity, Package, Users, Building2, CreditCard, FileText, User, Shield, Settings, Clock, Plus, Pencil, Trash2, Eye, Upload, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const actionIcons: Record<string, typeof Activity> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  view: Eye,
  export: Download,
  import: Upload,
  login: User,
  logout: User,
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
  create: 'text-green-500 bg-green-500/10',
  update: 'text-blue-500 bg-blue-500/10',
  delete: 'text-red-500 bg-red-500/10',
  view: 'text-gray-500 bg-gray-500/10',
  export: 'text-purple-500 bg-purple-500/10',
  import: 'text-yellow-500 bg-yellow-500/10',
  login: 'text-cyan-500 bg-cyan-500/10',
  logout: 'text-orange-500 bg-orange-500/10',
};

export function ActivityFeed() {
  const { activities, loading } = useActivityFeed(15);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Activity Feed
        </h3>
        <p className="text-muted-foreground text-sm">No recent activity. Actions will appear here as they happen.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Activity Feed
        <span className="ml-auto text-xs text-muted-foreground font-normal">Real-time</span>
      </h3>
      
      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
        {activities.map((activity, idx) => {
          const ActionIcon = actionIcons[activity.action_type] || Activity;
          const EntityIcon = entityIcons[activity.entity_type] || Package;
          const colorClass = actionColors[activity.action_type] || 'text-gray-500 bg-gray-500/10';
          
          return (
            <div
              key={activity.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-muted/30',
                idx !== activities.length - 1 && 'border-b border-border/30'
              )}
            >
              <div className={cn('p-2 rounded-lg', colorClass)}>
                <ActionIcon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <EntityIcon className="h-3 w-3 text-muted-foreground" />
                  <p className="font-medium text-sm truncate">
                    {activity.entity_name || activity.entity_type}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                {activity.user_email && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    by {activity.user_email.split('@')[0]}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
