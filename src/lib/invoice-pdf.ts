import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from './formatters';
import type { ClientInvoice, LineItem } from '@/hooks/useClientInvoices';

interface InvoiceExportData extends ClientInvoice {
  client_address?: string;
  client_email?: string;
}

export const exportInvoicePDF = (invoice: InvoiceExportData) => {
  const doc = new jsPDF();
  
  // Company Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 14, 25);
  
  // Company details (right side)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Favorite Logistics', 140, 20);
  doc.text('Cape Town, South Africa', 140, 26);
  doc.text('info@favoritelogistics.co.za', 140, 32);
  
  // Invoice details box
  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 40, 85, 35, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Number:', 18, 50);
  doc.text('Invoice Date:', 18, 58);
  doc.text('Due Date:', 18, 66);
  
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number, 55, 50);
  doc.text(format(new Date(invoice.invoice_date), 'dd MMM yyyy'), 55, 58);
  doc.text(invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : 'On Receipt', 55, 66);
  
  // LOT reference
  if (invoice.lot_number) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LOT Reference:', 18, 74);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.lot_number, 55, 74);
  }
  
  // Bill To section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 120, 50);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.client_name || 'Client', 120, 58);
  if (invoice.client_address) {
    doc.text(invoice.client_address, 120, 66);
  }
  if (invoice.client_email) {
    doc.text(invoice.client_email, 120, 74);
  }
  
  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    draft: [156, 163, 175],
    sent: [59, 130, 246],
    paid: [34, 197, 94],
    cancelled: [239, 68, 68],
  };
  const statusColor = statusColors[invoice.status] || [156, 163, 175];
  
  doc.setFillColor(...statusColor);
  doc.roundedRect(160, 40, 35, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.status.toUpperCase(), 177.5, 45.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  // Line items table
  let yPos = 95;
  
  const lineItems = invoice.line_items || [];
  
  if (lineItems.length > 0) {
    const tableData = lineItems.map((item: LineItem) => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(item.amount),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Qty', 'Unit Price', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [37, 99, 235],
        fontSize: 10,
        fontStyle: 'bold',
      },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    // Simple description if no line items
    doc.setFontSize(10);
    doc.text('Goods as per LOT ' + (invoice.lot_number || 'N/A'), 14, yPos);
    yPos += 15;
  }
  
  // Totals section
  const totalsX = 120;
  
  doc.setDrawColor(200);
  doc.line(totalsX, yPos, 195, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(formatCurrency(invoice.amount_zar), 195, yPos, { align: 'right' });
  yPos += 8;
  
  if (invoice.vat_amount && invoice.vat_amount > 0) {
    doc.text('VAT (15%):', totalsX, yPos);
    doc.text(formatCurrency(invoice.vat_amount), 195, yPos, { align: 'right' });
    yPos += 8;
  }
  
  doc.line(totalsX, yPos, 195, yPos);
  yPos += 8;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Due:', totalsX, yPos);
  doc.text(formatCurrency(invoice.total_amount || invoice.amount_zar), 195, yPos, { align: 'right' });
  
  // Notes section
  if (invoice.notes) {
    yPos += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(invoice.notes, 180);
    doc.text(splitNotes, 14, yPos);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text('Thank you for your business!', doc.internal.pageSize.getWidth() / 2, pageHeight - 20, { align: 'center' });
  doc.text('Payment terms: Net 30 days', doc.internal.pageSize.getWidth() / 2, pageHeight - 15, { align: 'center' });
  doc.setTextColor(0);
  
  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
};
