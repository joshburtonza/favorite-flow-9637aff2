import { useState } from 'react';
import { Plus, Calculator, Clock, CheckCircle, FileText } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { KPICard } from '@/components/ui/kpi-card';
import { FileCostingList } from '@/components/file-costing/FileCostingList';
import { CreateFileCostingDialog } from '@/components/file-costing/CreateFileCostingDialog';
import { useFileCostings, FileCosting } from '@/hooks/useFileCostings';
import { formatCurrency } from '@/lib/formatters';

export default function FileCostingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCosting, setEditingCosting] = useState<FileCosting | null>(null);
  const { data: costings } = useFileCostings();

  const stats = {
    total: costings?.length || 0,
    draft: costings?.filter(c => c.status === 'draft').length || 0,
    pending: costings?.filter(c => c.status === 'pending_review').length || 0,
    finalized: costings?.filter(c => c.status === 'finalized').length || 0,
    totalValue: costings?.reduce((sum, c) => sum + c.grand_total_zar, 0) || 0,
  };

  const handleEdit = (costing: FileCosting) => {
    setEditingCosting(costing);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingCosting(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">File Costing</h1>
            <p className="text-muted-foreground">
              Compile transport & clearing costs for shipments
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Costing
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <KPICard
            title="Total Costings"
            value={stats.total.toString()}
            icon={FileText}
          />
          <KPICard
            title="Draft"
            value={stats.draft.toString()}
            icon={Calculator}
          />
          <KPICard
            title="Pending Review"
            value={stats.pending.toString()}
            icon={Clock}
          />
          <KPICard
            title="Finalized"
            value={stats.finalized.toString()}
            icon={CheckCircle}
          />
        </div>

        {/* Total Value Card */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Costed Value (Finalized)</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(
                  costings?.filter(c => c.status === 'finalized').reduce((sum, c) => sum + c.grand_total_zar, 0) || 0,
                  'ZAR'
                )}
              </p>
            </div>
            <Calculator className="h-10 w-10 text-primary/50" />
          </div>
        </div>

        {/* List */}
        <FileCostingList onEdit={handleEdit} />

        {/* Dialog */}
        <CreateFileCostingDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          editingCosting={editingCosting}
        />
      </div>
    </AppLayout>
  );
}
