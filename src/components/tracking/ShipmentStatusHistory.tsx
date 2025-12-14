import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  Bot, 
  MessageSquare, 
  User, 
  CheckCircle2, 
  Truck, 
  FileText, 
  Package,
  Clock,
  DollarSign,
  Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface StatusEvent {
  id: string;
  timestamp: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, any> | null;
  ai_summary: string | null;
  metadata: Record<string, any> | null;
  user_email: string | null;
}

interface ShipmentStatusHistoryProps {
  shipmentId?: string;
  limit?: number;
}

const getEventIcon = (eventType: string, changes?: Record<string, any> | null) => {
  if (changes?.status) {
    const status = changes.status.new || changes.status;
    switch (status) {
      case 'in-transit': return Truck;
      case 'documents-submitted': return FileText;
      case 'completed': return Flag;
      default: return Package;
    }
  }
  
  if (eventType.includes('cost') || eventType.includes('payment')) return DollarSign;
  if (eventType.includes('document')) return FileText;
  if (eventType.includes('update')) return CheckCircle2;
  
  return Clock;
};

const getSourceIcon = (metadata?: Record<string, any> | null) => {
  const source = metadata?.source || metadata?.updated_via || 'manual';
  
  switch (source) {
    case 'ai':
    case 'ai_chat':
    case 'ai-intelligence':
      return { icon: Bot, label: 'AI', color: 'text-primary' };
    case 'telegram':
      return { icon: MessageSquare, label: 'Telegram', color: 'text-blue-500' };
    default:
      return { icon: User, label: 'Manual', color: 'text-muted-foreground' };
  }
};

const formatEventDescription = (event: StatusEvent): string => {
  if (event.ai_summary) return event.ai_summary;
  
  const changes = event.changes;
  if (!changes) return `${event.event_type} on ${event.entity_type}`;
  
  const descriptions: string[] = [];
  
  if (changes.status) {
    const oldStatus = changes.status.old || 'unknown';
    const newStatus = changes.status.new || changes.status;
    descriptions.push(`Status changed from ${oldStatus} to ${newStatus}`);
  }
  
  if (changes.freight_cost) {
    descriptions.push(`Freight cost updated: $${changes.freight_cost.new || changes.freight_cost}`);
  }
  
  if (changes.supplier_cost) {
    descriptions.push(`Supplier cost updated: $${changes.supplier_cost.new || changes.supplier_cost}`);
  }
  
  if (changes.telex_released) {
    descriptions.push('Telex released');
  }
  
  if (changes.document_submitted) {
    descriptions.push('Documents submitted');
  }
  
  return descriptions.length > 0 ? descriptions.join('. ') : `${event.event_type}`;
};

export function ShipmentStatusHistory({ shipmentId, limit = 10 }: ShipmentStatusHistoryProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['shipment-status-history', shipmentId, limit],
    queryFn: async () => {
      let query = supabase
        .from('ai_event_logs')
        .select('*')
        .eq('entity_type', 'shipment')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (shipmentId) {
        query = query.eq('entity_id', shipmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StatusEvent[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No status history yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
      
      <div className="space-y-6">
        {events.map((event, index) => {
          const EventIcon = getEventIcon(event.event_type, event.changes);
          const source = getSourceIcon(event.metadata);
          const SourceIcon = source.icon;
          
          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Timeline node */}
              <div 
                className={cn(
                  'relative z-10 w-10 h-10 rounded-full flex items-center justify-center',
                  'bg-background border-2 border-primary'
                )}
              >
                <EventIcon className="h-4 w-4 text-primary" />
              </div>
              
              {/* Event content */}
              <div className="flex-1 pb-2">
                <div className="glass-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {formatEventDescription(event)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}</span>
                        <span>•</span>
                        <span className={cn('flex items-center gap-1', source.color)}>
                          <SourceIcon className="h-3 w-3" />
                          {source.label}
                        </span>
                        {event.user_email && (
                          <>
                            <span>•</span>
                            <span>{event.user_email}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Source badge */}
                    <div 
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        source.label === 'AI' && 'bg-primary/10 text-primary',
                        source.label === 'Telegram' && 'bg-blue-500/10 text-blue-500',
                        source.label === 'Manual' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {source.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
