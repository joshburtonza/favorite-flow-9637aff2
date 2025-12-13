import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Users, 
  Mail, 
  Phone,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['supplier-shipments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_shipments_full')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter in memory since v_shipments_full might not have supplier_id directly accessible
      return (data || []).filter(s => (s as any).supplier_id === id);
    },
    enabled: !!id,
  });

  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery({
    queryKey: ['supplier-ledger', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_ledger')
        .select('*')
        .eq('supplier_id', id!)
        .order('transaction_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['supplier-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_schedule')
        .select('*')
        .eq('supplier_id', id!)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isLoading = supplierLoading || shipmentsLoading || ledgerLoading || paymentsLoading;

  // Calculate financial summary
  const financialSummary = {
    totalCosts: shipments?.reduce((sum, s) => sum + (s.supplier_cost || 0), 0) || 0,
    shipmentCount: shipments?.length || 0,
    pendingPayments: payments?.filter(p => p.status === 'pending').length || 0,
    totalPaid: payments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount_foreign || 0), 0) || 0,
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'text-red-500';
    if (balance < 0) return 'text-green-500';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!supplier) {
    return (
      <AppLayout>
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Supplier not found</p>
          <Button onClick={() => navigate('/suppliers')} className="mt-4 rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <header className="animate-slide-in">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/suppliers')}
            className="mb-4 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Supplier Details</p>
              <h1 className="text-3xl font-semibold gradient-text">{supplier.name}</h1>
              <p className="text-muted-foreground mt-1">{supplier.currency} • {supplier.contact_person || 'No contact'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Current Balance</p>
              <p className={cn('text-3xl font-bold', getBalanceClass(supplier.current_balance))}>
                {formatCurrency(Math.abs(supplier.current_balance), supplier.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {supplier.current_balance > 0 ? 'owed to supplier' : supplier.current_balance < 0 ? 'credit balance' : 'balanced'}
              </p>
            </div>
          </div>
        </header>

        {/* Contact Info */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {supplier.email && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{supplier.email}</p>
                </div>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{supplier.phone}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium">{supplier.currency}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Shipments</span>
            </div>
            <p className="text-3xl font-bold">{financialSummary.shipmentCount}</p>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Purchased</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(financialSummary.totalCosts, supplier.currency, { compact: true })}</p>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Paid</span>
            </div>
            <p className="text-3xl font-bold text-green-500">
              {formatCurrency(financialSummary.totalPaid, supplier.currency, { compact: true })}
            </p>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="h-5 w-5 text-yellow-500" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Pending Payments</span>
            </div>
            <p className="text-3xl font-bold text-yellow-500">{financialSummary.pendingPayments}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ledger Entries */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Ledger Entries
            </h3>
            
            {!ledgerEntries || ledgerEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No ledger entries found
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {ledgerEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        entry.ledger_type === 'debit' ? 'bg-red-500/10' : 'bg-green-500/10'
                      )}>
                        {entry.ledger_type === 'debit' ? (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{entry.description || entry.ledger_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.transaction_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <p className={cn(
                      'font-semibold',
                      entry.ledger_type === 'debit' ? 'text-red-500' : 'text-green-500'
                    )}>
                      {entry.ledger_type === 'debit' ? '+' : '-'}
                      {formatCurrency(entry.amount, supplier.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shipments */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Recent Shipments
            </h3>
            
            {!shipments || shipments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No shipments found
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {shipments.slice(0, 10).map((shipment) => (
                  <div 
                    key={shipment.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/shipments/${shipment.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">LOT {shipment.lot_number}</p>
                      <p className="text-xs text-muted-foreground">{shipment.commodity || 'No commodity'}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={shipment.status || 'pending'} />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(shipment.supplier_cost || 0, supplier.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payments Table */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment History
          </h3>
          
          {!payments || payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments found for this supplier
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Amount</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">FX Rate</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">ZAR Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          payment.status === 'completed' 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-yellow-500/10 text-yellow-500'
                        )}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(payment.amount_foreign, payment.currency)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {payment.fx_rate.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(payment.amount_zar || 0, 'ZAR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
