import { useState } from 'react';
import { useClientInvoices, useUpdateInvoiceStatus, InvoiceStatus } from '@/hooks/useClientInvoices';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useClients } from '@/hooks/useClients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/formatters';
import { exportInvoicePDF } from '@/lib/invoice-pdf';
import { format } from 'date-fns';
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  MoreHorizontal,
  Send,
  CheckCircle,
  XCircle,
  Filter,
  Settings2
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { InvoiceCardMobile } from './InvoiceCardMobile';
import { CompanySettingsDialog } from './CompanySettingsDialog';

interface InvoiceListProps {
  onCreateNew: () => void;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  paid: { label: 'Paid', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export function InvoiceList({ onCreateNew }: InvoiceListProps) {
  const { data: invoices, isLoading } = useClientInvoices();
  const { data: clients } = useClients();
  const { settings: companySettings } = useCompanySettings();
  const updateStatus = useUpdateInvoiceStatus();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isMobile = useIsMobile();

  const filteredInvoices = invoices?.filter(inv => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.lot_number?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: string, status: InvoiceStatus) => {
    updateStatus.mutate({ 
      id, 
      status,
      paid_date: status === 'paid' ? new Date().toISOString().split('T')[0] : undefined
    });
  };

  const handleExportPDF = (invoice: typeof invoices extends (infer T)[] ? T : never) => {
    // Get client details for the invoice
    const client = clients?.find(c => c.id === invoice.client_id);
    const enrichedInvoice = {
      ...invoice,
      client_address: client?.address || undefined,
      client_email: client?.email || undefined,
      client_phone: client?.phone || undefined,
    };
    exportInvoicePDF(enrichedInvoice, { companySettings });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Calculate totals
  const totalDraft = invoices?.filter(i => i.status === 'draft').reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
  const totalSent = invoices?.filter(i => i.status === 'sent').reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
  const totalPaid = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Draft Invoices</p>
                <p className="text-2xl font-bold">{formatCurrency(totalDraft)}</p>
              </div>
              <Badge variant="secondary">{invoices?.filter(i => i.status === 'draft').length || 0}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Awaiting Payment</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSent)}</p>
              </div>
              <Badge variant="default">{invoices?.filter(i => i.status === 'sent').length || 0}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(totalPaid)}</p>
              </div>
              <Badge variant="outline" className="text-green-500 border-green-500">
                {invoices?.filter(i => i.status === 'paid').length || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('draft')}>Draft</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('sent')}>Sent</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('paid')}>Paid</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>Cancelled</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSettingsOpen(true)} className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
          <Button onClick={onCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Client Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices && filteredInvoices.length > 0 ? (
            isMobile ? (
              <div className="space-y-3">
                {filteredInvoices.map((invoice) => (
                  <InvoiceCardMobile
                    key={invoice.id}
                    invoice={invoice}
                    onStatusChange={handleStatusChange}
                    onExportPDF={handleExportPDF}
                  />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>LOT</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>{invoice.client_name || '-'}</TableCell>
                      <TableCell>
                        {invoice.lot_number ? (
                          <Badge variant="outline">LOT {invoice.lot_number}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total_amount || invoice.amount_zar)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[invoice.status].variant}>
                          {statusConfig[invoice.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleExportPDF(invoice)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'sent')}>
                                <Send className="h-4 w-4 mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'sent' && (
                              <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'paid')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusChange(invoice.id, 'cancelled')}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Invoice
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
              <Button variant="link" onClick={onCreateNew}>
                Create your first invoice
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CompanySettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
