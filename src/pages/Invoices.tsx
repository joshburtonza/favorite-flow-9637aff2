import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { CreateInvoiceDialog } from '@/components/invoices/CreateInvoiceDialog';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function InvoicesContent() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
    toast.success('Invoices refreshed');
  }, [queryClient]);

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="space-y-8">
          {/* Header */}
          <header className="animate-slide-in">
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="p-2 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(239 84% 67% / 0.2), hsl(187 94% 43% / 0.2))',
                }}
              >
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Client Billing</p>
                <h1 className="text-3xl font-semibold gradient-text">Invoices</h1>
              </div>
            </div>
            <p className="text-muted-foreground">
              Generate and manage client invoices. Link to shipments for automatic cost population.
            </p>
          </header>

          {/* Invoice List */}
          <InvoiceList onCreateNew={() => setCreateDialogOpen(true)} />
        </div>
      </PullToRefresh>

      <CreateInvoiceDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </AppLayout>
  );
}

export default function Invoices() {
  return (
    <PermissionGate permission="view_payments" pageLevel>
      <InvoicesContent />
    </PermissionGate>
  );
}
