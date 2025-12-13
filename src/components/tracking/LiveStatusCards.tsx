import { useShipments } from '@/hooks/useShipments';
import { Calendar, FileCheck, Ship, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function LiveStatusCards() {
  const navigate = useNavigate();
  const { data: shipments, isLoading } = useShipments({ status: undefined });

  // Get active shipments (not completed), limit to 6
  const activeShipments = shipments?.filter(s => s.status !== 'completed').slice(0, 6) || [];

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (activeShipments.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Ship className="h-5 w-5 text-primary" />
          Live Status
        </h3>
        <p className="text-muted-foreground text-sm">No active shipments</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Ship className="h-5 w-5 text-primary" />
        Live Status
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeShipments.map((shipment) => (
          <div
            key={shipment.id}
            onClick={() => navigate(`/shipments/${shipment.id}`)}
            className={cn(
              'relative p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer',
              'bg-gradient-to-br from-background/50 to-background/20',
              'border-border/50 hover:border-primary/30'
            )}
          >
            {/* Status indicator dot */}
            <div className={cn(
              'absolute top-3 right-3 w-2 h-2 rounded-full animate-pulse',
              shipment.status === 'in-transit' && 'bg-yellow-500',
              shipment.status === 'pending' && 'bg-blue-500',
              shipment.status === 'documents-submitted' && 'bg-green-500',
              shipment.status === 'completed' && 'bg-gray-500'
            )} />
            
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm">LOT {shipment.lot_number}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {shipment.commodity || 'No commodity'}
                </p>
              </div>
              
              <StatusBadge status={shipment.status} />
              
              <div className="space-y-1.5 pt-2 border-t border-border/30">
                {shipment.eta && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">ETA:</span>
                    <span className="font-medium">{format(new Date(shipment.eta), 'MMM d')}</span>
                  </div>
                )}
                
                {shipment.delivery_date && (
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Delivery:</span>
                    <span className="font-medium">{format(new Date(shipment.delivery_date), 'MMM d')}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs">
                  <FileCheck className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Docs:</span>
                  <span className={cn(
                    'font-medium',
                    shipment.document_submitted ? 'text-green-500' : 'text-yellow-500'
                  )}>
                    {shipment.document_submitted ? 'Submitted' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
