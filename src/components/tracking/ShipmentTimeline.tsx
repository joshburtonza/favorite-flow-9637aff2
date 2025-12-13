import { useShipments } from '@/hooks/useShipments';
import { CheckCircle2, Circle, Package, Truck, FileText, Flag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STAGES = [
  { id: 'pending', label: 'Pending', icon: Package },
  { id: 'in-transit', label: 'In Transit', icon: Truck },
  { id: 'documents-submitted', label: 'Docs Submitted', icon: FileText },
  { id: 'completed', label: 'Completed', icon: Flag },
];

function getStageIndex(status: string): number {
  const index = STAGES.findIndex(s => s.id === status);
  return index >= 0 ? index : 0;
}

export function ShipmentTimeline() {
  const { data: shipments, isLoading } = useShipments({ status: undefined });

  // Get active shipments (not completed)
  const activeShipments = shipments?.filter(s => s.status !== 'completed').slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="glass-card p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (activeShipments.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Shipment Timeline
        </h3>
        <p className="text-muted-foreground text-sm">No active shipments to track</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        Shipment Timeline
      </h3>
      
      <div className="space-y-5">
        {activeShipments.map((shipment) => {
          const currentStageIndex = getStageIndex(shipment.status);
          
          return (
            <div key={shipment.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">LOT {shipment.lot_number}</span>
                <span className="text-xs text-muted-foreground">
                  {(shipment as any).supplier?.name || 'Unknown Supplier'}
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {STAGES.map((stage, idx) => {
                    const StageIcon = stage.icon;
                    const isCompleted = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    
                    return (
                      <div key={stage.id} className="flex flex-col items-center z-10">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                            isCompleted && 'bg-primary text-primary-foreground',
                            isCurrent && 'bg-primary/20 border-2 border-primary text-primary',
                            !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <StageIcon className="h-4 w-4" />
                          )}
                        </div>
                        <span className={cn(
                          'text-[10px] mt-1 text-center',
                          isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'
                        )}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Connecting Line */}
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-muted -z-0">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
