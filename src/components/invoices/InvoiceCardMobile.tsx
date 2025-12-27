import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { MoreVertical, Download, Send, CheckCircle, XCircle, FileText } from 'lucide-react';
import { InvoiceStatus } from '@/hooks/useClientInvoices';

interface InvoiceCardMobileProps {
  invoice: {
    id: string;
    invoice_number: string;
    client_name: string | null;
    lot_number: string | null;
    invoice_date: string;
    total_amount: number | null;
    amount_zar: number;
    status: InvoiceStatus;
  };
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  onExportPDF: (invoice: any) => void;
}

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-primary/20 text-primary' },
  paid: { label: 'Paid', className: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/20 text-destructive' },
};

export function InvoiceCardMobile({ invoice, onStatusChange, onExportPDF }: InvoiceCardMobileProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-mono font-medium">{invoice.invoice_number}</span>
            <p className="text-xs text-muted-foreground">
              {invoice.client_name || 'No client'}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExportPDF(invoice)}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
            {invoice.status === 'draft' && (
              <DropdownMenuItem onClick={() => onStatusChange(invoice.id, 'sent')}>
                <Send className="h-4 w-4 mr-2" />
                Mark as Sent
              </DropdownMenuItem>
            )}
            {invoice.status === 'sent' && (
              <DropdownMenuItem onClick={() => onStatusChange(invoice.id, 'paid')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
              <DropdownMenuItem 
                onClick={() => onStatusChange(invoice.id, 'cancelled')}
                className="text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={statusConfig[invoice.status].className}>
            {statusConfig[invoice.status].label}
          </Badge>
          {invoice.lot_number && (
            <Badge variant="outline" className="text-xs">
              LOT {invoice.lot_number}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
          </span>
        </div>
        <span className="font-bold text-lg">
          {formatCurrency(invoice.total_amount || invoice.amount_zar)}
        </span>
      </div>
    </div>
  );
}
