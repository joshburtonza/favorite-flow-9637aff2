import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShipment, useUpdateShipment, useUpdateShipmentCosts, useDeleteShipment } from '@/hooks/useShipments';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useClients } from '@/hooks/useClients';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCreatePayment } from '@/hooks/usePayments';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { ShipmentStatus, CurrencyType } from '@/types/database';
import { calculateShipmentCosts, CostInputs } from '@/lib/calculations';
import { formatCurrency, formatRate, formatPercentage, getCurrencySymbol, getProfitClass } from '@/lib/formatters';
import { exportShipmentPDF } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EditModeBanner } from '@/components/ui/edit-mode-banner';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Save, Trash2, CalendarIcon, Loader2, Eye, CreditCard, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SupplierLedgerModal } from '@/components/suppliers/SupplierLedgerModal';
import { ShipmentStatusHistory } from '@/components/tracking/ShipmentStatusHistory';
import { toast } from 'sonner';

export function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: shipment, isLoading } = useShipment(id!);
  const { data: suppliers } = useSuppliers();
  const { data: clients } = useClients();
  const { data: bankAccounts } = useBankAccounts();
  const updateShipment = useUpdateShipment();
  const updateCosts = useUpdateShipmentCosts();
  const deleteShipment = useDeleteShipment();
  const createPayment = useCreatePayment();

  // Enable real-time updates for this shipment
  useRealtimeSubscription({
    tables: ['shipments', 'shipment_costs', 'supplier_ledger'],
    showToasts: true,
  });

  // Form state
  const [supplierId, setSupplierId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [commodity, setCommodity] = useState('');
  const [eta, setEta] = useState<Date | undefined>();
  const [status, setStatus] = useState<ShipmentStatus>('pending');
  const [documentSubmitted, setDocumentSubmitted] = useState(false);
  const [documentSubmittedDate, setDocumentSubmittedDate] = useState<Date | undefined>();
  const [telexReleased, setTelexReleased] = useState(false);
  const [telexReleasedDate, setTelexReleasedDate] = useState<Date | undefined>();
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');

  // Cost form state
  const [sourceCurrency, setSourceCurrency] = useState<CurrencyType>('USD');
  const [costInputs, setCostInputs] = useState<CostInputs>({
    supplierCost: 0,
    freightCost: 0,
    clearingCost: 0,
    transportCost: 0,
    fxSpotRate: 0,
    fxAppliedRate: 0,
    clientInvoiceZar: 0,
    bankCharges: 0,
  });

  // Edit mode state (read-only by default)
  const [isEditMode, setIsEditMode] = useState(false);

  // Modal states
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFxRate, setPaymentFxRate] = useState('');
  const [paymentBankId, setPaymentBankId] = useState('');

  // Initialize form with shipment data
  useEffect(() => {
    if (shipment) {
      setSupplierId(shipment.supplier_id || '');
      setClientId(shipment.client_id || '');
      setCommodity(shipment.commodity || '');
      setEta(shipment.eta ? new Date(shipment.eta) : undefined);
      setStatus(shipment.status);
      setDocumentSubmitted(shipment.document_submitted);
      setDocumentSubmittedDate(shipment.document_submitted_date ? new Date(shipment.document_submitted_date) : undefined);
      setTelexReleased(shipment.telex_released);
      setTelexReleasedDate(shipment.telex_released_date ? new Date(shipment.telex_released_date) : undefined);
      setDeliveryDate(shipment.delivery_date ? new Date(shipment.delivery_date) : undefined);
      setNotes(shipment.notes || '');

      if (shipment.costs) {
        setSourceCurrency(shipment.costs.source_currency);
        setCostInputs({
          supplierCost: Number(shipment.costs.supplier_cost) || 0,
          freightCost: Number(shipment.costs.freight_cost) || 0,
          clearingCost: Number(shipment.costs.clearing_cost) || 0,
          transportCost: Number(shipment.costs.transport_cost) || 0,
          fxSpotRate: Number(shipment.costs.fx_spot_rate) || 0,
          fxAppliedRate: Number(shipment.costs.fx_applied_rate) || 0,
          clientInvoiceZar: Number(shipment.costs.client_invoice_zar) || 0,
          bankCharges: Number(shipment.costs.bank_charges) || 0,
        });
        // Pre-fill payment dialog with shipment costs
        setPaymentAmount(String(shipment.costs.total_foreign || 0));
        setPaymentFxRate(String(shipment.costs.fx_applied_rate || 0));
      }
    }
  }, [shipment]);

  // Real-time calculations
  const calculations = useMemo(() => calculateShipmentCosts(costInputs), [costInputs]);

  const updateCostField = (field: keyof CostInputs, value: string) => {
    setCostInputs(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const handleSave = async () => {
    if (!id) return;

    await updateShipment.mutateAsync({
      id,
      supplier_id: supplierId || null,
      client_id: clientId || null,
      commodity,
      eta: eta ? format(eta, 'yyyy-MM-dd') : null,
      status,
      document_submitted: documentSubmitted,
      document_submitted_date: documentSubmittedDate ? format(documentSubmittedDate, 'yyyy-MM-dd') : null,
      telex_released: telexReleased,
      telex_released_date: telexReleasedDate ? format(telexReleasedDate, 'yyyy-MM-dd') : null,
      delivery_date: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : null,
      notes,
    });

    await updateCosts.mutateAsync({
      shipmentId: id,
      source_currency: sourceCurrency,
      supplier_cost: costInputs.supplierCost,
      freight_cost: costInputs.freightCost,
      clearing_cost: costInputs.clearingCost,
      transport_cost: costInputs.transportCost,
      fx_spot_rate: costInputs.fxSpotRate,
      fx_applied_rate: costInputs.fxAppliedRate,
      client_invoice_zar: costInputs.clientInvoiceZar,
      bank_charges: costInputs.bankCharges,
    });
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteShipment.mutateAsync({ id, lotNumber: shipment?.lot_number });
    navigate('/');
  };

  const handleSchedulePayment = async () => {
    if (!supplierId || !paymentDate || !paymentAmount || !paymentFxRate) return;

    await createPayment.mutateAsync({
      supplier_id: supplierId,
      shipment_id: id,
      bank_account_id: paymentBankId || undefined,
      payment_date: format(paymentDate, 'yyyy-MM-dd'),
      amount_foreign: parseFloat(paymentAmount),
      currency: sourceCurrency,
      fx_rate: parseFloat(paymentFxRate),
    });

    setPaymentDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Shipment not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const currencySymbol = getCurrencySymbol(sourceCurrency);
  const isSaving = updateShipment.isPending || updateCosts.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            LOT {shipment.lot_number}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={status} />
            <span className="text-sm text-muted-foreground">
              ETA: {eta ? format(eta, 'dd MMM yyyy') : 'Not set'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              const supplierName = suppliers?.find(s => s.id === supplierId)?.name || null;
              const clientName = clients?.find(c => c.id === clientId)?.name || null;
              exportShipmentPDF({
                lot_number: shipment.lot_number,
                supplier_name: supplierName,
                client_name: clientName,
                commodity,
                eta: eta ? format(eta, 'yyyy-MM-dd') : null,
                status,
                document_submitted: documentSubmitted,
                telex_released: telexReleased,
                delivery_date: deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : null,
                costs: shipment.costs ? {
                  source_currency: sourceCurrency,
                  supplier_cost: costInputs.supplierCost,
                  freight_cost: costInputs.freightCost,
                  clearing_cost: costInputs.clearingCost,
                  transport_cost: costInputs.transportCost,
                  total_foreign: calculations.totalForeign,
                  fx_spot_rate: costInputs.fxSpotRate,
                  fx_applied_rate: costInputs.fxAppliedRate,
                  fx_spread: calculations.fxSpread,
                  total_zar: calculations.totalZar,
                  client_invoice_zar: costInputs.clientInvoiceZar,
                  gross_profit_zar: calculations.grossProfit,
                  fx_commission_zar: calculations.fxCommission,
                  fx_spread_profit_zar: calculations.spreadProfit,
                  bank_charges: costInputs.bankCharges,
                  net_profit_zar: calculations.netProfit,
                  profit_margin: calculations.profitMargin,
                } : null,
              });
              toast.success('PDF exported successfully');
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {supplierId && (
            <>
              <Button variant="outline" onClick={() => setLedgerOpen(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Supplier Ledger
              </Button>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Schedule Payment
              </Button>
            </>
          )}
          {isEditMode && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleteShipment.isPending}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this shipment? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit Mode Banner */}
      <EditModeBanner
        isEditMode={isEditMode}
        onEnableEdit={() => setIsEditMode(true)}
        onDisableEdit={() => setIsEditMode(false)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shipment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId} disabled={!isEditMode}>
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
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientId} onValueChange={setClientId} disabled={!isEditMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Commodity</Label>
              <Input value={commodity} onChange={(e) => setCommodity(e.target.value)} placeholder="Enter commodity" disabled={!isEditMode} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>ETA</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" disabled={!isEditMode} className={cn('w-full justify-start text-left font-normal', !eta && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eta ? format(eta, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={eta} onSelect={setEta} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ShipmentStatus)} disabled={!isEditMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-transit">In Transit</SelectItem>
                    <SelectItem value="documents-submitted">Documents Submitted</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="doc-submitted" checked={documentSubmitted} onCheckedChange={(c) => setDocumentSubmitted(!!c)} disabled={!isEditMode} />
                  <Label htmlFor="doc-submitted">Document Submitted</Label>
                </div>
                {documentSubmitted && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start" disabled={!isEditMode}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {documentSubmittedDate ? format(documentSubmittedDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={documentSubmittedDate} onSelect={setDocumentSubmittedDate} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="telex-released" checked={telexReleased} onCheckedChange={(c) => setTelexReleased(!!c)} disabled={!isEditMode} />
                  <Label htmlFor="telex-released">Telex Released</Label>
                </div>
                {telexReleased && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start" disabled={!isEditMode}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {telexReleasedDate ? format(telexReleasedDate, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={telexReleasedDate} onSelect={setTelexReleasedDate} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Delivery Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" disabled={!isEditMode} className={cn('w-full justify-start text-left font-normal', !deliveryDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryDate ? format(deliveryDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." rows={3} disabled={!isEditMode} />
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Currency Selection */}
            <div className="space-y-2">
              <Label>Source Currency</Label>
              <Select value={sourceCurrency} onValueChange={(v) => setSourceCurrency(v as CurrencyType)} disabled={!isEditMode}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="ZAR">ZAR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cost Inputs */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">COSTS ({sourceCurrency})</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Supplier Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                    <Input type="number" step="0.01" className="pl-8 currency-display" value={costInputs.supplierCost || ''} onChange={(e) => updateCostField('supplierCost', e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Freight Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                    <Input type="number" step="0.01" className="pl-8 currency-display" value={costInputs.freightCost || ''} onChange={(e) => updateCostField('freightCost', e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Clearing Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                    <Input type="number" step="0.01" className="pl-8 currency-display" value={costInputs.clearingCost || ''} onChange={(e) => updateCostField('clearingCost', e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Transport Cost</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                    <Input type="number" step="0.01" className="pl-8 currency-display" value={costInputs.transportCost || ''} onChange={(e) => updateCostField('transportCost', e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
                <span className="font-medium">TOTAL ({sourceCurrency})</span>
                <span className="text-lg font-bold currency-display">{currencySymbol}{formatCurrency(calculations.totalForeign, sourceCurrency, { showSymbol: false })}</span>
              </div>
            </div>

            <Separator />

            {/* FX Conversion */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">FX CONVERSION</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Spot Rate (ZAR)</Label>
                  <Input type="number" step="0.0001" className="currency-display" value={costInputs.fxSpotRate || ''} onChange={(e) => updateCostField('fxSpotRate', e.target.value)} disabled={!isEditMode} />
                </div>
                <div className="space-y-2">
                  <Label>Applied Rate (ZAR)</Label>
                  <Input type="number" step="0.0001" className="currency-display" value={costInputs.fxAppliedRate || ''} onChange={(e) => updateCostField('fxAppliedRate', e.target.value)} disabled={!isEditMode} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Spread</p>
                  <p className={cn('text-lg font-bold', calculations.fxSpread > 0 ? 'profit-positive' : 'profit-neutral')}>
                    {formatRate(calculations.fxSpread)}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">Total ZAR</p>
                  <p className="text-lg font-bold currency-display">{formatCurrency(calculations.totalZar)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Revenue & Profit */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">REVENUE & PROFIT</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client Invoice (ZAR)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                    <Input type="number" step="0.01" className="pl-8 currency-display" value={costInputs.clientInvoiceZar || ''} onChange={(e) => updateCostField('clientInvoiceZar', e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bank Charges (ZAR)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R</span>
                    <Input type="number" step="0.01" className="pl-8 currency-display" value={costInputs.bankCharges || ''} onChange={(e) => updateCostField('bankCharges', e.target.value)} disabled={!isEditMode} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Gross Profit</span>
                  <span className={cn('font-semibold', getProfitClass(calculations.grossProfit))}>{formatCurrency(calculations.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">FX Commission (1.4%)</span>
                  <span className="profit-positive">{formatCurrency(calculations.fxCommission)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">FX Spread Profit</span>
                  <span className={cn(calculations.spreadProfit >= 0 ? 'profit-positive' : 'profit-negative')}>{formatCurrency(calculations.spreadProfit)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Bank Charges</span>
                  <span className="profit-negative">-{formatCurrency(costInputs.bankCharges)}</span>
                </div>
              </div>

              <Separator />

              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">NET PROFIT</span>
                  <span className={cn('text-2xl font-bold', getProfitClass(calculations.netProfit))}>
                    {formatCurrency(calculations.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-muted-foreground">Profit Margin</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatPercentage(calculations.profitMargin)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <ShipmentStatusHistory shipmentId={id} limit={15} />
        </CardContent>
      </Card>

      {/* Supplier Ledger Modal */}
      {supplierId && (
        <SupplierLedgerModal
          supplierId={supplierId}
          open={ledgerOpen}
          onOpenChange={setLedgerOpen}
        />
      )}

      {/* Schedule Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Payment for LOT {shipment.lot_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Date</Label>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount ({sourceCurrency})</Label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>FX Rate</Label>
                <Input type="number" step="0.0001" value={paymentFxRate} onChange={(e) => setPaymentFxRate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={paymentBankId} onValueChange={setPaymentBankId}>
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
            {paymentAmount && paymentFxRate && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Estimated ZAR Amount</p>
                <p className="text-lg font-bold currency-display">
                  {formatCurrency(parseFloat(paymentAmount) * parseFloat(paymentFxRate))}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSchedulePayment} disabled={createPayment.isPending}>
              {createPayment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}