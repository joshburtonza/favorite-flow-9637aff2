import { useState } from 'react';
import { useSupplier, useSupplierLedger, useCreateLedgerEntry } from '@/hooks/useSuppliers';
import { useShipments } from '@/hooks/useShipments';
import { LedgerType, CurrencyType } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { exportSupplierLedgerPDF } from '@/lib/pdf-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SupplierLedgerModalProps {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierLedgerModal({ supplierId, open, onOpenChange }: SupplierLedgerModalProps) {
  const { data: supplier, isLoading: supplierLoading } = useSupplier(supplierId);
  const { data: ledgerEntries, isLoading: ledgerLoading } = useSupplierLedger(supplierId);
  const { data: shipments } = useShipments();
  const createEntry = useCreateLedgerEntry();

  const [transactionDate, setTransactionDate] = useState<Date | undefined>(new Date());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [shipmentId, setShipmentId] = useState('');
  const [ledgerType, setLedgerType] = useState<LedgerType>('debit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setTransactionDate(new Date());
    setInvoiceNumber('');
    setShipmentId('');
    setLedgerType('debit');
    setAmount('');
    setDescription('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionDate || !amount) return;

    await createEntry.mutateAsync({
      supplier_id: supplierId,
      shipment_id: shipmentId || undefined,
      transaction_date: format(transactionDate, 'yyyy-MM-dd'),
      invoice_number: invoiceNumber || undefined,
      ledger_type: ledgerType,
      amount: parseFloat(amount),
      description: description || undefined,
      notes: notes || undefined,
    });

    resetForm();
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'profit-negative';
    if (balance < 0) return 'profit-positive';
    return 'profit-neutral';
  };

  const isLoading = supplierLoading || ledgerLoading;

  // Calculate running balance
  const entriesWithBalance = [...(ledgerEntries || [])].reverse().reduce((acc, entry, index) => {
    const previousBalance = index === 0 ? 0 : acc[index - 1].runningBalance;
    const change = entry.ledger_type === 'debit' ? entry.amount : -entry.amount;
    const runningBalance = previousBalance + change;
    return [...acc, { ...entry, runningBalance }];
  }, [] as (typeof ledgerEntries extends (infer T)[] | undefined ? T & { runningBalance: number } : never)[]).reverse();

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Supplier Ledger</span>
            {supplier && (
              <Badge variant="outline" className="ml-2">
                {supplier.currency}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Supplier Summary */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{supplier?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {supplier?.contact_person && `${supplier.contact_person} • `}
                    {supplier?.email || 'No email'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className={cn('text-2xl font-bold currency-display', getBalanceClass(supplier?.current_balance || 0))}>
                    {formatCurrency(Math.abs(supplier?.current_balance || 0), supplier?.currency as CurrencyType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(supplier?.current_balance || 0) > 0 ? 'Owed to supplier' : (supplier?.current_balance || 0) < 0 ? 'Credit balance' : 'Balanced'}
                  </p>
                </div>
              </div>
            </div>

            <Tabs defaultValue="transactions" className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="add">Add Entry</TabsTrigger>
                </TabsList>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (supplier && ledgerEntries) {
                      exportSupplierLedgerPDF(
                        {
                          name: supplier.name,
                          currency: supplier.currency,
                          current_balance: supplier.current_balance,
                          contact_person: supplier.contact_person,
                          email: supplier.email,
                          phone: supplier.phone,
                        },
                        ledgerEntries.map(e => ({
                          transaction_date: e.transaction_date,
                          invoice_number: e.invoice_number,
                          description: e.description,
                          ledger_type: e.ledger_type,
                          amount: e.amount,
                          balance_after: e.balance_after,
                          lot_number: e.shipment ? (e.shipment as { lot_number: string }).lot_number : null,
                        }))
                      );
                      toast.success('PDF exported successfully');
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>

              <TabsContent value="transactions" className="flex-1 overflow-auto mt-0">
                {entriesWithBalance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No transactions recorded yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right text-destructive">Debit</TableHead>
                        <TableHead className="text-right text-success">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entriesWithBalance.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDate(entry.transaction_date)}</TableCell>
                          <TableCell>{entry.invoice_number || '-'}</TableCell>
                          <TableCell>
                            {entry.description || '-'}
                            {entry.shipment && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (LOT: {(entry.shipment as { lot_number: string }).lot_number})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right currency-display profit-negative">
                            {entry.ledger_type === 'debit' ? formatCurrency(entry.amount, supplier?.currency as CurrencyType) : '-'}
                          </TableCell>
                          <TableCell className="text-right currency-display profit-positive">
                            {entry.ledger_type === 'credit' ? formatCurrency(entry.amount, supplier?.currency as CurrencyType) : '-'}
                          </TableCell>
                          <TableCell className={cn('text-right font-semibold currency-display', getBalanceClass(entry.runningBalance))}>
                            {formatCurrency(Math.abs(entry.runningBalance), supplier?.currency as CurrencyType)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="add" className="mt-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Transaction Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn('w-full justify-start', !transactionDate && 'text-muted-foreground')}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {transactionDate ? format(transactionDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={transactionDate} onSelect={setTransactionDate} className="pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Number</Label>
                      <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select value={ledgerType} onValueChange={(v) => setLedgerType(v as LedgerType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debit">Debit (Invoice Received)</SelectItem>
                          <SelectItem value="credit">Credit (Payment Made)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Link to Shipment (Optional)</Label>
                    <Select value={shipmentId} onValueChange={setShipmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select shipment" />
                      </SelectTrigger>
                      <SelectContent>
                        {shipments?.filter(s => s.supplier_id === supplierId).map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.lot_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Transaction description..." rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes..." rows={2} />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetForm}>Clear</Button>
                    <Button type="submit" disabled={createEntry.isPending}>
                      {createEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Entry'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}