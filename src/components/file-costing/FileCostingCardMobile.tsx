import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCosting } from '@/hooks/useFileCostings';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { Edit, CheckCircle, Download, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FileCostingCardMobileProps {
  costing: FileCosting;
  onEdit: (costing: FileCosting) => void;
  onFinalize: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (costing: FileCosting) => void;
}

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-warning/20 text-warning',
  finalized: 'bg-green-500/20 text-green-400',
};

const statusLabels = {
  draft: 'Draft',
  pending_review: 'Pending',
  finalized: 'Finalized',
};

export function FileCostingCardMobile({ 
  costing, 
  onEdit, 
  onFinalize, 
  onDelete, 
  onDownload 
}: FileCostingCardMobileProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 rounded-xl border border-border bg-card/50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-semibold">LOT {costing.lot_number || 'N/A'}</span>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={statusColors[costing.status]}>
              {statusLabels[costing.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(costing.created_at), 'dd MMM yyyy')}
            </span>
          </div>
        </div>
        <span className="font-bold text-lg">
          {formatCurrency(costing.grand_total_zar, 'ZAR')}
        </span>
      </div>

      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs text-muted-foreground">View breakdown</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Transport</span>
            <span>{formatCurrency(costing.transport_cost_zar, 'ZAR')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Clearing</span>
            <span>{formatCurrency(costing.clearing_cost_zar, 'ZAR')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Other</span>
            <span>{formatCurrency(costing.other_costs_zar, 'ZAR')}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
        {costing.status !== 'finalized' && (
          <>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(costing)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onFinalize(costing.id)}>
              <CheckCircle className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => onDownload(costing)}>
          <Download className="h-4 w-4" />
        </Button>
        {costing.status === 'draft' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete File Costing?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the costing for LOT {costing.lot_number}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(costing.id)}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
