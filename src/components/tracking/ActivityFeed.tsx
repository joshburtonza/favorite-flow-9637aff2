import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Package, CreditCard, FileText, TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'shipment' | 'payment' | 'ledger' | 'status';
  title: string;
  description: string;
  timestamp: string;
  icon: typeof Activity;
  color: string;
}

export function ActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      const items: ActivityItem[] = [];
      
      // Get recent shipments
      const { data: shipments } = await supabase
        .from('shipments')
        .select('id, lot_number, status, created_at, updated_at, suppliers(name)')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      shipments?.forEach(s => {
        items.push({
          id: `ship-${s.id}`,
          type: 'shipment',
          title: `LOT ${s.lot_number}`,
          description: `Status: ${s.status.replace('-', ' ')}`,
          timestamp: s.updated_at,
          icon: Package,
          color: 'text-blue-500',
        });
      });
      
      // Get recent payments
      const { data: payments } = await supabase
        .from('payment_schedule')
        .select('id, amount_foreign, currency, status, created_at, suppliers(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      payments?.forEach(p => {
        items.push({
          id: `pay-${p.id}`,
          type: 'payment',
          title: `Payment ${p.status}`,
          description: `${p.currency} ${p.amount_foreign.toLocaleString()} - ${p.suppliers?.name || 'Unknown'}`,
          timestamp: p.created_at,
          icon: CreditCard,
          color: p.status === 'completed' ? 'text-green-500' : 'text-yellow-500',
        });
      });
      
      // Get recent ledger entries
      const { data: ledger } = await supabase
        .from('supplier_ledger')
        .select('id, ledger_type, amount, description, created_at, suppliers(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      ledger?.forEach(l => {
        items.push({
          id: `led-${l.id}`,
          type: 'ledger',
          title: `${l.ledger_type === 'debit' ? 'Debit' : 'Credit'} Entry`,
          description: `${l.suppliers?.name}: ${l.description || 'Transaction'}`,
          timestamp: l.created_at,
          icon: l.ledger_type === 'debit' ? TrendingUp : FileText,
          color: l.ledger_type === 'debit' ? 'text-red-500' : 'text-green-500',
        });
      });
      
      // Sort by timestamp and limit
      return items
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
    },
  });

  if (isLoading) {
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
        <p className="text-muted-foreground text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        Activity Feed
      </h3>
      
      <div className="space-y-1">
        {activities.map((activity, idx) => {
          const Icon = activity.icon;
          
          return (
            <div
              key={activity.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-muted/30',
                idx !== activities.length - 1 && 'border-b border-border/30'
              )}
            >
              <div className={cn('p-2 rounded-lg bg-muted/50', activity.color)}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
