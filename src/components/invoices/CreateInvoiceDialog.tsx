import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateInvoice, useShipmentsReadyForInvoicing, LineItem } from '@/hooks/useClientInvoices';
import { useClients } from '@/hooks/useClients';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Trash2, Package, AlertCircle } from 'lucide-react';

const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Client is required'),
  shipment_id: z.string().optional(),
  amount_zar: z.number().min(0.01, 'Amount must be greater than 0'),
  include_vat: z.boolean().default(false),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
  lot_number: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInvoiceDialog({ open, onOpenChange }: CreateInvoiceDialogProps) {
  const { data: clients } = useClients();
  const { data: shipmentsReady } = useShipmentsReadyForInvoicing();
  const createInvoice = useCreateInvoice();
  
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<typeof shipmentsReady extends (infer T)[] ? T : never | null>(null);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      client_id: '',
      shipment_id: '',
      amount_zar: 0,
      include_vat: false,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      notes: '',
      lot_number: '',
    },
  });

  const includeVat = form.watch('include_vat');
  const amount = form.watch('amount_zar');
  const vatAmount = includeVat ? amount * 0.15 : 0;
  const totalAmount = amount + vatAmount;

  // Auto-populate from shipment
  useEffect(() => {
    if (selectedShipment) {
      form.setValue('amount_zar', selectedShipment.client_invoice_zar || 0);
      form.setValue('lot_number', selectedShipment.lot_number || '');
      
      // Add line items from shipment costs
      const items: LineItem[] = [];
      if (selectedShipment.supplier_cost && selectedShipment.supplier_cost > 0) {
        items.push({
          description: `Goods - ${selectedShipment.commodity || 'Commodity'}`,
          quantity: 1,
          unit_price: selectedShipment.supplier_cost * (selectedShipment.fx_applied_rate || 1),
          amount: selectedShipment.supplier_cost * (selectedShipment.fx_applied_rate || 1),
        });
      }
      if (selectedShipment.freight_cost && selectedShipment.freight_cost > 0) {
        items.push({
          description: 'Freight Charges',
          quantity: 1,
          unit_price: selectedShipment.freight_cost * (selectedShipment.fx_applied_rate || 1),
          amount: selectedShipment.freight_cost * (selectedShipment.fx_applied_rate || 1),
        });
      }
      if (selectedShipment.clearing_cost && selectedShipment.clearing_cost > 0) {
        items.push({
          description: 'Clearing Charges',
          quantity: 1,
          unit_price: selectedShipment.clearing_cost * (selectedShipment.fx_applied_rate || 1),
          amount: selectedShipment.clearing_cost * (selectedShipment.fx_applied_rate || 1),
        });
      }
      if (selectedShipment.transport_cost && selectedShipment.transport_cost > 0) {
        items.push({
          description: 'Transport Charges',
          quantity: 1,
          unit_price: selectedShipment.transport_cost * (selectedShipment.fx_applied_rate || 1),
          amount: selectedShipment.transport_cost * (selectedShipment.fx_applied_rate || 1),
        });
      }
      setLineItems(items);
    }
  }, [selectedShipment, form]);

  const handleShipmentSelect = (shipmentId: string) => {
    const shipment = shipmentsReady?.find(s => s.id === shipmentId);
    setSelectedShipment(shipment || null);
    form.setValue('shipment_id', shipmentId);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Recalculate amount
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].amount = updated[index].quantity * updated[index].unit_price;
    }
    
    setLineItems(updated);
    
    // Update total
    const total = updated.reduce((sum, item) => sum + item.amount, 0);
    form.setValue('amount_zar', total);
  };

  const removeLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
    const total = updated.reduce((sum, item) => sum + item.amount, 0);
    form.setValue('amount_zar', total);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    await createInvoice.mutateAsync({
      client_id: data.client_id,
      shipment_id: data.shipment_id || undefined,
      amount_zar: data.amount_zar,
      vat_amount: vatAmount,
      line_items: lineItems,
      invoice_date: data.invoice_date,
      due_date: data.due_date || undefined,
      notes: data.notes || undefined,
      lot_number: data.lot_number || undefined,
    });
    
    form.reset();
    setLineItems([]);
    setSelectedShipment(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Client Invoice</DialogTitle>
          <DialogDescription>
            Generate a new invoice for a client. You can link it to a shipment for auto-population.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Quick select from ready shipments */}
            {shipmentsReady && shipmentsReady.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Shipments Ready for Invoicing</span>
                    <Badge variant="secondary">{shipmentsReady.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {shipmentsReady.slice(0, 5).map((shipment) => (
                      <Button
                        key={shipment.id}
                        type="button"
                        variant={selectedShipment?.id === shipment.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleShipmentSelect(shipment.id!)}
                      >
                        LOT {shipment.lot_number}
                        <span className="ml-2 text-xs opacity-70">
                          {formatCurrency(shipment.client_invoice_zar || 0)}
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lot_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LOT Reference</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 881" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Line Items</h4>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {lineItems.length > 0 ? (
                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-5"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      />
                      <Input
                        className="col-span-2"
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                      <Input
                        className="col-span-2"
                        type="number"
                        placeholder="Unit Price"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                      <div className="col-span-2 text-right font-medium">
                        {formatCurrency(item.amount)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="col-span-1"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No line items yet. Add items or enter total amount below.</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormField
                  control={form.control}
                  name="amount_zar"
                  render={({ field }) => (
                    <FormItem className="flex-1 max-w-xs">
                      <FormLabel>Subtotal (ZAR) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="include_vat"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">Include VAT (15%)</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                    {includeVat && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>VAT (15%)</span>
                        <span>{formatCurrency(vatAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional notes or payment instructions..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
