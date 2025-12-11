import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { usePayments, useCreatePayment, useMarkPaymentPaid, useDeletePayment } from '@/hooks/usePayments';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useShipments } from '@/hooks/useShipments';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { PaymentStatus, CurrencyType } from '@/types/database';
import { formatCurrency, formatDate, formatRate } from '@/lib/formatters';
import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CalendarIcon, Check, Trash2, Loader2, DollarSign, CreditCard, TrendingUp } from 'lucide-react';
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

  // Calculate totals
  const totalPending = pendingPayments?.reduce((sum, p) => sum + Number(p.amount_zar), 0) || 0;
  const totalCompleted = completedPayments?.reduce((sum, p) => sum + Number(p.amount_zar), 0) || 0;
  const totalCommission = completedPayments?.reduce((sum, p) => sum + Number(p.commission_earned), 0) || 0;

  const isLoading = pendingLoading || completedLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground">Schedule and track supplier payments</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Payment
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <KPICard
            title="Pending Payments"
            value={formatCurrency(totalPending, 'ZAR', { compact: true })}
            icon={DollarSign}
            description={`${pendingPayments?.length || 0} payments scheduled`}
          />
          <KPICard
            title="Paid This Month"
            value={formatCurrency(totalCompleted, 'ZAR', { compact: true })}
            icon={CreditCard}
            description={`${completedPayments?.length || 0} payments completed`}
          />
          <KPICard
            title="Commission Earned"
            value={formatCurrency(totalCommission, 'ZAR', { compact: true })}
            icon={TrendingUp}
            description="From FX transactions"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming ({pendingPayments?.length || 0})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedPayments?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {pendingPayments?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-center">No upcoming payments scheduled.</p>
                  <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Payment
                  </Button>
                </CardContent>
              </Card>
            ) : isMobile ? (
              <div className="space-y-3">
                {pendingPayments?.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{payment.supplier?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.shipment?.lot_number || 'No LOT'} • {formatDate(payment.payment_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold currency-display">
                            {formatCurrency(payment.amount_foreign, payment.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(payment.amount_zar)} ZAR
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Rate: {formatRate(payment.fx_rate)}</span>
                        <span>{payment.bank_account?.name || 'No bank'}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 min-h-[44px]"
                          onClick={() => markPaid.mutate(payment.id)}
                          disabled={markPaid.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Paid
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="min-h-[44px]"
                          onClick={() => deletePayment.mutate(payment.id)}
                          disabled={deletePayment.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>LOT</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">FX Rate</TableHead>
                      <TableHead className="text-right">ZAR</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell className="font-medium">{payment.supplier?.name || '-'}</TableCell>
                        <TableCell>{payment.shipment?.lot_number || '-'}</TableCell>
                        <TableCell className="text-right currency-display">
                          {formatCurrency(payment.amount_foreign, payment.currency)}
                        </TableCell>
                        <TableCell className="text-right currency-display">{formatRate(payment.fx_rate)}</TableCell>
                        <TableCell className="text-right font-semibold currency-display">
                          {formatCurrency(payment.amount_zar)}
                        </TableCell>
                        <TableCell>{payment.bank_account?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => markPaid.mutate(payment.id)}
                              disabled={markPaid.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deletePayment.mutate(payment.id)}
                              disabled={deletePayment.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedPayments?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground text-center">No completed payments yet.</p>
                </CardContent>
              </Card>
            ) : isMobile ? (
              <div className="space-y-3">
                {completedPayments?.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{payment.supplier?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            Paid {formatDate(payment.paid_date)}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-status-completed/20 text-status-completed border-status-completed/30">
                          Paid
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-medium currency-display">
                            {formatCurrency(payment.amount_foreign, payment.currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">ZAR Paid</p>
                          <p className="font-semibold currency-display">
                            {formatCurrency(payment.amount_zar)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">FX Rate</p>
                          <p className="font-medium currency-display">{formatRate(payment.fx_rate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground">Commission</p>
                          <p className="font-medium profit-positive currency-display">
                            {formatCurrency(payment.commission_earned)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">FX Rate</TableHead>
                      <TableHead className="text-right">ZAR Paid</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedPayments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.paid_date)}</TableCell>
                        <TableCell className="font-medium">{payment.supplier?.name || '-'}</TableCell>
                        <TableCell className="text-right currency-display">
                          {formatCurrency(payment.amount_foreign, payment.currency)}
                        </TableCell>
                        <TableCell className="text-right currency-display">{formatRate(payment.fx_rate)}</TableCell>
                        <TableCell className="text-right font-semibold currency-display">
                          {formatCurrency(payment.amount_zar)}
                        </TableCell>
                        <TableCell className="text-right profit-positive currency-display">
                          {formatCurrency(payment.commission_earned)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-status-completed/20 text-status-completed border-status-completed/30">
                            Paid
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start', !paymentDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Shipment (Optional)</Label>
                <Select value={shipmentId} onValueChange={setShipmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Link to shipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {shipments?.filter(s => !supplierId || s.supplier_id === supplierId).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.lot_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" value={amountForeign} onChange={(e) => setAmountForeign(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="ZAR">ZAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>FX Rate *</Label>
                <Input type="number" step="0.0001" value={fxRate} onChange={(e) => setFxRate(e.target.value)} placeholder="18.5000" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}