import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { CreateInvoiceDialog } from '@/components/invoices/CreateInvoiceDialog';
import { FileText } from 'lucide-react';

export default function Invoices() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <AppLayout>
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

      <CreateInvoiceDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </AppLayout>
  );
}
