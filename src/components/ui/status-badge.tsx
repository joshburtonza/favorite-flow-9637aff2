import { ShipmentStatus } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ShipmentStatus;
  className?: string;
}

const statusConfig: Record<ShipmentStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-status-pending/20 text-status-pending border-status-pending/30',
  },
  'in-transit': {
    label: 'In Transit',
    className: 'bg-status-in-transit/20 text-status-in-transit border-status-in-transit/30',
  },
  'documents-submitted': {
    label: 'Docs Submitted',
    className: 'bg-status-documents/20 text-status-documents border-status-documents/30',
  },
  completed: {
    label: 'Completed',
    className: 'bg-status-completed/20 text-status-completed border-status-completed/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}