import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency } from './formatters';
import type { ClientInvoice, LineItem } from '@/hooks/useClientInvoices';
import type { CompanySettings } from '@/hooks/useCompanySettings';

interface InvoiceExportData extends ClientInvoice {
  client_address?: string;
  client_email?: string;
  client_phone?: string;
}

interface ExportOptions {
  companySettings?: CompanySettings;
}

const DEFAULT_COMPANY = {
  companyName: 'Favorite Logistics (Pty) Ltd',
  companyAddress: '123 Industrial Road\nCape Town, 8001\nSouth Africa',
  companyPhone: '+27 21 555 0123',
  companyEmail: 'accounts@favoritelogistics.co.za',
  companyVatNumber: '4123456789',
  companyRegNumber: '2020/123456/07',
  bankName: 'First National Bank',
  bankAccountName: 'Favorite Logistics (Pty) Ltd',
  bankAccountNumber: '62123456789',
  bankBranchCode: '250655',
  bankSwiftCode: 'FIRNZAJJ',
  logoUrl: null as string | null,
  signatureUrl: null as string | null,
  paymentTerms: 'Payment due within 30 days of invoice date.',
  invoiceFooter: 'Thank you for your business!',
};

export const exportInvoicePDF = (invoice: InvoiceExportData, options?: ExportOptions) => {
  const doc = new jsPDF();
  const company = options?.companySettings || DEFAULT_COMPANY;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  let yPos = 15;
  
  // Logo or Company Name Header
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', 14, yPos, 50, 20);
      yPos = 40;
    } catch {
      // Fallback to text if image fails
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(company.companyName, 14, yPos + 10);
      yPos = 30;
    }
  } else {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName, 14, yPos + 5);
    yPos = 25;
  }
  
  // Company Details (left side)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  const addressLines = company.companyAddress.split('\n');
  addressLines.forEach((line, i) => {
    doc.text(line, 14, yPos + (i * 4));
  });
  yPos += addressLines.length * 4;
  doc.text(company.companyPhone, 14, yPos);
  yPos += 4;
  doc.text(company.companyEmail, 14, yPos);
  yPos += 4;
  doc.text(`VAT: ${company.companyVatNumber}`, 14, yPos);
  yPos += 4;
  doc.text(`Reg: ${company.companyRegNumber}`, 14, yPos);
  doc.setTextColor(0);
  
  // INVOICE Title (right side)
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('INVOICE', pageWidth - 14, 25, { align: 'right' });
  doc.setTextColor(0);
  
  // Invoice Details Box (right side)
  const invoiceBoxY = 35;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice Number:', pageWidth - 70, invoiceBoxY);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.invoice_number, pageWidth - 14, invoiceBoxY, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.text('Invoice Date:', pageWidth - 70, invoiceBoxY + 6);
  doc.text(format(new Date(invoice.invoice_date), 'dd MMMM yyyy'), pageWidth - 14, invoiceBoxY + 6, { align: 'right' });
  
  doc.text('Due Date:', pageWidth - 70, invoiceBoxY + 12);
  doc.text(invoice.due_date ? format(new Date(invoice.due_date), 'dd MMMM yyyy') : 'On Receipt', pageWidth - 14, invoiceBoxY + 12, { align: 'right' });
  
  if (invoice.lot_number) {
    doc.text('LOT Reference:', pageWidth - 70, invoiceBoxY + 18);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.lot_number, pageWidth - 14, invoiceBoxY + 18, { align: 'right' });
  }
  
  // Status Badge
  const statusColors: Record<string, [number, number, number]> = {
    draft: [156, 163, 175],
    sent: [59, 130, 246],
    paid: [34, 197, 94],
    cancelled: [239, 68, 68],
  };
  const statusColor = statusColors[invoice.status] || [156, 163, 175];
  
  const statusY = invoice.lot_number ? invoiceBoxY + 28 : invoiceBoxY + 22;
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - 45, statusY - 4, 31, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.status.toUpperCase(), pageWidth - 29.5, statusY, { align: 'center' });
  doc.setTextColor(0);
  
  // Bill To Section
  yPos = 75;
  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, 85, 30, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('BILL TO', 18, yPos + 7);
  doc.setTextColor(0);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.client_name || 'Client', 18, yPos + 14);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let billToY = yPos + 19;
  if (invoice.client_address) {
    const clientAddressLines = invoice.client_address.split('\n');
    clientAddressLines.forEach((line, i) => {
      doc.text(line, 18, billToY + (i * 4));
    });
    billToY += clientAddressLines.length * 4;
  }
  if (invoice.client_email) {
    doc.text(invoice.client_email, 18, billToY);
    billToY += 4;
  }
  if (invoice.client_phone) {
    doc.text(invoice.client_phone, 18, billToY);
  }
  
  // Line items table
  yPos = 115;
  
  const lineItems = invoice.line_items || [];
  
  if (lineItems.length > 0) {
    const tableData = lineItems.map((item: LineItem, index: number) => [
      (index + 1).toString(),
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unit_price),
      formatCurrency(item.amount),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Description', 'Qty', 'Unit Price', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [37, 99, 235],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    // Simple description if no line items
    doc.setFontSize(10);
    doc.text('Goods and services as per agreement', 14, yPos);
    if (invoice.lot_number) {
      doc.text(`LOT Reference: ${invoice.lot_number}`, 14, yPos + 6);
    }
    yPos += 20;
  }
  
  // Totals section (right aligned)
  const totalsX = 120;
  const totalsWidth = 75;
  
  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX, yPos, totalsWidth, invoice.vat_amount && invoice.vat_amount > 0 ? 35 : 25, 2, 2, 'F');
  
  let totalY = yPos + 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX + 5, totalY);
  doc.text(formatCurrency(invoice.amount_zar), totalsX + totalsWidth - 5, totalY, { align: 'right' });
  
  if (invoice.vat_amount && invoice.vat_amount > 0) {
    totalY += 8;
    doc.text('VAT (15%):', totalsX + 5, totalY);
    doc.text(formatCurrency(invoice.vat_amount), totalsX + totalsWidth - 5, totalY, { align: 'right' });
  }
  
  totalY += 10;
  doc.setDrawColor(37, 99, 235);
  doc.line(totalsX + 5, totalY - 4, totalsX + totalsWidth - 5, totalY - 4);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('TOTAL DUE:', totalsX + 5, totalY + 2);
  doc.text(formatCurrency(invoice.total_amount || invoice.amount_zar), totalsX + totalsWidth - 5, totalY + 2, { align: 'right' });
  doc.setTextColor(0);
  
  yPos = totalY + 20;
  
  // Bank Details Section
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, yPos, 90, 40, 2, 2, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('BANKING DETAILS', 18, yPos + 8);
  doc.setTextColor(0);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const bankY = yPos + 14;
  doc.text(`Bank: ${company.bankName}`, 18, bankY);
  doc.text(`Account Name: ${company.bankAccountName}`, 18, bankY + 5);
  doc.text(`Account No: ${company.bankAccountNumber}`, 18, bankY + 10);
  doc.text(`Branch Code: ${company.bankBranchCode}`, 18, bankY + 15);
  doc.text(`SWIFT: ${company.bankSwiftCode}`, 18, bankY + 20);
  
  // Payment Terms
  if (company.paymentTerms) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80);
    doc.text(company.paymentTerms, 110, yPos + 8);
    doc.setTextColor(0);
  }
  
  // Notes section
  if (invoice.notes) {
    yPos += 50;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(invoice.notes, 180);
    doc.text(splitNotes, 14, yPos + 6);
    yPos += 6 + (splitNotes.length * 4);
  }
  
  // Signature Section
  yPos = Math.max(yPos + 15, 230);
  
  if (company.signatureUrl) {
    try {
      doc.addImage(company.signatureUrl, 'PNG', 14, yPos, 40, 15);
      yPos += 18;
    } catch {
      // Skip if image fails
    }
  }
  
  doc.setDrawColor(0);
  doc.line(14, yPos, 70, yPos);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Authorized Signature', 14, yPos + 5);
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(company.invoiceFooter, pageWidth / 2, pageHeight - 18, { align: 'center' });
  
  doc.setFontSize(7);
  doc.text(`${company.companyName} | ${company.companyEmail} | ${company.companyPhone}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.setTextColor(0);
  
  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
};
