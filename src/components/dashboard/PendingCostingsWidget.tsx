import { useFileCostings } from '@/hooks/useFileCostings';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, ArrowRight, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function PendingCostingsWidget() {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const { data: costings, isLoading } = useFileCostings();

  // Only show to admins and filter pending_review items
  if (!isAdmin) return null;

  const pendingCostings = costings?.filter(c => c.status === 'pending_review').slice(0, 5) || [];
  const totalPending = costings?.filter(c => c.status === 'pending_review').reduce((sum, c) => sum + (c.grand_total_zar || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Pending Review</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    );
  }

  if (pendingCostings.length === 0) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Pending Review</h3>
        </div>
        <div className="text-center py-6 text-muted-foreground text-sm">
          No costings pending review
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-warning" />
          <h3 className="font-semibold">Pending Review</h3>
          <Badge variant="secondary" className="text-warning bg-warning/10">
            {pendingCostings.length}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs gap-1"
          onClick={() => navigate('/file-costing')}
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Pending Value</span>
          <span className="font-bold text-warning">{formatCurrency(totalPending, 'ZAR')}</span>
        </div>
      </div>

      <div className="space-y-2">
        {pendingCostings.map((costing) => (
          <div 
            key={costing.id}
            className="flex items-center justify-between p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
            onClick={() => navigate('/file-costing')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div>
                <span className="font-medium text-sm">
                  LOT {costing.lot_number || 'N/A'}
                </span>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(costing.created_at), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
            <span className="font-semibold text-sm">
              {formatCurrency(costing.grand_total_zar, 'ZAR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
