import { useClientInvoices } from '@/hooks/useClientInvoices';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { startOfMonth, isAfter } from 'date-fns';

export function QuickStatsWidget() {
  const { data: invoices, isLoading } = useClientInvoices();

  const monthStart = startOfMonth(new Date());

  const stats = {
    invoicedThisMonth: invoices
      ?.filter(i => isAfter(new Date(i.invoice_date), monthStart))
      .reduce((sum, i) => sum + (i.total_amount || i.amount_zar), 0) || 0,
    collectedThisMonth: invoices
      ?.filter(i => i.status === 'paid' && i.paid_date && isAfter(new Date(i.paid_date), monthStart))
      .reduce((sum, i) => sum + (i.total_amount || i.amount_zar), 0) || 0,
    outstanding: invoices
      ?.filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + (i.total_amount || i.amount_zar), 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-accent" />
          <h3 className="font-semibold">This Month</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-accent" />
        <h3 className="font-semibold">This Month</h3>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Invoiced</span>
            </div>
            <span className="font-bold text-lg text-primary">
              {formatCurrency(stats.invoicedThisMonth, 'ZAR', { compact: true })}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Collected</span>
            </div>
            <span className="font-bold text-lg text-green-400">
              {formatCurrency(stats.collectedThisMonth, 'ZAR', { compact: true })}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">Outstanding</span>
            </div>
            <span className="font-bold text-lg text-warning">
              {formatCurrency(stats.outstanding, 'ZAR', { compact: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
