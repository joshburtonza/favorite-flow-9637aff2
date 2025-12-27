import { useClientInvoices, InvoiceStatus } from '@/hooks/useClientInvoices';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-primary/20 text-primary' },
  paid: { label: 'Paid', className: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/20 text-destructive' },
};

export function RecentInvoicesWidget() {
  const navigate = useNavigate();
  const { data: invoices, isLoading } = useClientInvoices();

  const recentInvoices = invoices?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Recent Invoices</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Recent Invoices</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs gap-1"
          onClick={() => navigate('/invoices')}
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {recentInvoices.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No invoices yet
        </div>
      ) : (
        <div className="space-y-2">
          {recentInvoices.map((invoice) => (
            <div 
              key={invoice.id}
              className="flex items-center justify-between p-3 rounded-xl bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
              onClick={() => navigate('/invoices')}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    {invoice.invoice_number}
                  </span>
                  <Badge className={statusConfig[invoice.status].className}>
                    {statusConfig[invoice.status].label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {invoice.client_name || 'No client'} • {format(new Date(invoice.invoice_date), 'dd MMM')}
                </p>
              </div>
              <span className="font-semibold text-sm">
                {formatCurrency(invoice.total_amount || invoice.amount_zar)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
