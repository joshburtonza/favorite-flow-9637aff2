import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePayments, useCreatePayment, useMarkPaymentPaid, useDeletePayment } from '@/hooks/usePayments';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useShipments } from '@/hooks/useShipments';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { CurrencyType } from '@/types/database';
import { formatCurrency, formatDate, formatRate } from '@/lib/formatters';
import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CalendarIcon, Check, Trash2, Loader2, DollarSign, CreditCard, TrendingUp, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Payments() {
  const isMobile = useIsMobile();
  const { data: pendingPayments, isLoading: pendingLoading } = usePayments('pending');
  const { data: completedPayments, isLoading: completedLoading } = usePayments('completed');
  const { data: suppliers } = useSuppliers();
  const { data: shipments } = useShipments();
  const { data: bankAccounts } = useBankAccounts();
  const createPayment = useCreatePayment();
  const markPaid = useMarkPaymentPaid();
  const deletePayment = useDeletePayment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date | undefined>();
  const [amountForeign, setAmountForeign] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [fxRate, setFxRate] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setSupplierId('');
    setShipmentId('');
    setBankAccountId('');
    setPaymentDate(undefined);
    setAmountForeign('');
    setCurrency('USD');
    setFxRate('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !paymentDate || !amountForeign || !fxRate) return;

    await createPayment.mutateAsync({
      supplier_id: supplierId,
      shipment_id: shipmentId || undefined,
      bank_account_id: bankAccountId || undefined,
      payment_date: format(paymentDate, 'yyyy-MM-dd'),
      amount_foreign: parseFloat(amountForeign),
      currency,
      fx_rate: parseFloat(fxRate),
      notes: notes || undefined,
    });

    resetForm();
    setDialogOpen(false);
  };

  const totalPending = pendingPayments?.reduce((sum, p) => sum + Number(p.amount_zar), 0) || 0;
  const totalCompleted = completedPayments?.reduce((sum, p) => sum + Number(p.amount_zar), 0) || 0;
  const totalCommission = completedPayments?.reduce((sum, p) => sum + Number(p.commission_earned), 0) || 0;

  const isLoading = pendingLoading || completedLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
          <div className="bento-grid">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentPayments = activeTab === 'upcoming' ? pendingPayments : completedPayments;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Finance</p>
            <h1 className="text-3xl font-semibold gradient-text">Payments</h1>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="search-glass flex-1 md:w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search payments..." 
                className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => setDialogOpen(true)}
              className="rounded-xl"
              style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        </header>

        {/* Summary KPIs */}
        <div className="bento-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <KPICard
            title="Pending Payments"
            value={formatCurrency(totalPending, 'ZAR', { compact: true })}
            icon={DollarSign}
            description={`${pendingPayments?.length || 0} scheduled`}
          />
          <KPICard
            title="Paid This Month"
            value={formatCurrency(totalCompleted, 'ZAR', { compact: true })}
            icon={CreditCard}
            description={`${completedPayments?.length || 0} completed`}
          />
          <KPICard
            title="Commission Earned"
            value={formatCurrency(totalCommission, 'ZAR', { compact: true })}
            icon={TrendingUp}
            description="From FX transactions"
          />
        </div>

        {/* Tab Switcher */}
        <div className="glass-card p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'upcoming'
                  ? 'text-foreground border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{
                background: activeTab === 'upcoming'
                  ? 'linear-gradient(135deg, hsl(239 84% 67% / 0.2), hsl(187 94% 43% / 0.2))'
                  : 'transparent',
              }}
            >
              Upcoming ({pendingPayments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'completed'
                  ? 'text-foreground border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{
                background: activeTab === 'completed'
                  ? 'linear-gradient(135deg, hsl(239 84% 67% / 0.2), hsl(187 94% 43% / 0.2))'
                  : 'transparent',
              }}
            >
              Completed ({completedPayments?.length || 0})
            </button>
          </div>
        </div>

        {/* Payments List */}
        {currentPayments?.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-16">
            <CreditCard className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">
              {activeTab === 'upcoming' ? 'No upcoming payments scheduled.' : 'No completed payments yet.'}
            </p>
            {activeTab === 'upcoming' && (
              <Button 
                className="mt-4 rounded-xl"
                onClick={() => setDialogOpen(true)}
                style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Payment
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {currentPayments?.map((payment) => (
              <div key={payment.id} className="glass-card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{payment.supplier?.name || 'Unknown'}</h3>
                    <p className="text-sm text-muted-foreground">
                      {payment.shipment?.lot_number || 'No LOT'} • {formatDate(activeTab === 'upcoming' ? payment.payment_date : payment.paid_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatCurrency(payment.amount_foreign, payment.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(payment.amount_zar)} ZAR
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>Rate: {formatRate(payment.fx_rate)}</span>
                  <span>{payment.bank_account?.name || 'No bank'}</span>
                  {activeTab === 'completed' && (
                    <span className="text-success">Commission: {formatCurrency(payment.commission_earned)}</span>
                  )}
                </div>

                {activeTab === 'upcoming' && (
                  <div className="flex gap-2 pt-4 border-t border-glass-border">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="flex-1 rounded-xl hover:bg-success/20 hover:text-success"
                      onClick={() => markPaid.mutate(payment.id)}
                      disabled={markPaid.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark Paid
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="rounded-xl hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => deletePayment.mutate(payment.id)}
                      disabled={deletePayment.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {activeTab === 'completed' && (
                  <div className="pt-4 border-t border-glass-border">
                    <Badge className="trend-badge trend-up">
                      <Check className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg glass-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="gradient-text">Schedule Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Payment Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn('w-full justify-start rounded-xl bg-glass-surface border-glass-border', !paymentDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-glass-border" align="start">
                    <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="rounded-xl bg-glass-surface border-glass-border">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-glass-border">
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Shipment (Optional)</Label>
                <Select value={shipmentId} onValueChange={setShipmentId}>
                  <SelectTrigger className="rounded-xl bg-glass-surface border-glass-border">
                    <SelectValue placeholder="Link to shipment" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-glass-border">
                    {shipments?.filter(s => !supplierId || s.supplier_id === supplierId).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.lot_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Bank Account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="rounded-xl bg-glass-surface border-glass-border">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-glass-border">
                    {bankAccounts?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Amount *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={amountForeign} 
                  onChange={(e) => setAmountForeign(e.target.value)} 
                  placeholder="0.00"
                  className="rounded-xl bg-glass-surface border-glass-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyType)}>
                  <SelectTrigger className="rounded-xl bg-glass-surface border-glass-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-glass-border">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="ZAR">ZAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">FX Rate *</Label>
                <Input 
                  type="number" 
                  step="0.0001" 
                  value={fxRate} 
                  onChange={(e) => setFxRate(e.target.value)} 
                  placeholder="18.5000"
                  className="rounded-xl bg-glass-surface border-glass-border"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPayment.isPending}
                className="rounded-xl"
                style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))' }}
              >
                {createPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
