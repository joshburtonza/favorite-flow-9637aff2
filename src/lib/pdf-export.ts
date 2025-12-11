import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { formatCurrency, formatPercentage, CurrencyCode } from './formatters';

// Helper to safely cast currency
const asCurrency = (currency: string): CurrencyCode => {
  if (currency === 'USD' || currency === 'EUR' || currency === 'ZAR') {
    return currency;
  }
  return 'USD';
};

interface ShipmentData {
  lot_number: string;
  supplier_name?: string | null;
  client_name?: string | null;
  commodity?: string | null;
  eta?: string | null;
  status: string;
  document_submitted: boolean;
  telex_released: boolean;
  delivery_date?: string | null;
  costs?: {
    source_currency: string;
    supplier_cost: number;
    freight_cost: number;
    clearing_cost: number;
    transport_cost: number;
    total_foreign?: number | null;
    fx_spot_rate: number;
    fx_applied_rate: number;
    fx_spread?: number | null;
    total_zar?: number | null;
    client_invoice_zar: number;
    gross_profit_zar?: number | null;
    fx_commission_zar?: number | null;
    fx_spread_profit_zar?: number | null;
    bank_charges: number;
    net_profit_zar?: number | null;
    profit_margin?: number | null;
  } | null;
}

interface LedgerEntry {
  transaction_date: string;
  invoice_number?: string | null;
  description?: string | null;
  ledger_type: 'debit' | 'credit';
  amount: number;
  balance_after?: number | null;
  lot_number?: string | null;
}

interface SupplierData {
  name: string;
  currency: string;
  current_balance: number;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
}

// Helper to add header
const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);
  
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 28);
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, subtitle ? 36 : 28);
  
  return subtitle ? 45 : 37;
};

// Helper to add footer
const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount} | Favorite Logistics`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
};

// Export single shipment detail
export const exportShipmentPDF = (shipment: ShipmentData) => {
  const doc = new jsPDF();
  const currencyStr = shipment.costs?.source_currency || 'USD';
  const currency = asCurrency(currencyStr);
  
  let yPos = addHeader(doc, `LOT ${shipment.lot_number}`, `Shipment Detail Report`);
  
  // Shipment Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Shipment Information', 14, yPos);
  yPos += 8;
  
  const shipmentInfo = [
    ['Supplier', shipment.supplier_name || '-'],
    ['Client', shipment.client_name || '-'],
    ['Commodity', shipment.commodity || '-'],
    ['ETA', shipment.eta ? format(new Date(shipment.eta), 'dd MMM yyyy') : '-'],
    ['Delivery Date', shipment.delivery_date ? format(new Date(shipment.delivery_date), 'dd MMM yyyy') : '-'],
    ['Status', shipment.status.replace('-', ' ').toUpperCase()],
    ['Documents Submitted', shipment.document_submitted ? 'Yes' : 'No'],
    ['Telex Released', shipment.telex_released ? 'Yes' : 'No'],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: shipmentInfo,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 80 },
    },
    styles: { fontSize: 10 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Cost Breakdown
  if (shipment.costs) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Cost Breakdown', 14, yPos);
    yPos += 8;
    
    const costData = [
      ['Supplier Cost', `${currency} ${formatCurrency(shipment.costs.supplier_cost, currency, { showSymbol: false })}`],
      ['Freight Cost', `${currency} ${formatCurrency(shipment.costs.freight_cost, currency, { showSymbol: false })}`],
      ['Clearing Cost', `${currency} ${formatCurrency(shipment.costs.clearing_cost, currency, { showSymbol: false })}`],
      ['Transport Cost', `${currency} ${formatCurrency(shipment.costs.transport_cost, currency, { showSymbol: false })}`],
      ['Total Foreign', `${currency} ${formatCurrency(shipment.costs.total_foreign || 0, currency, { showSymbol: false })}`],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Amount']],
      body: costData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // FX Conversion
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('FX Conversion', 14, yPos);
    yPos += 8;
    
    const fxData = [
      ['Spot Rate', `R ${shipment.costs.fx_spot_rate.toFixed(4)}`],
      ['Applied Rate', `R ${shipment.costs.fx_applied_rate.toFixed(4)}`],
      ['Spread', `R ${(shipment.costs.fx_spread || 0).toFixed(4)}`],
      ['Total ZAR', formatCurrency(shipment.costs.total_zar || 0)],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Value']],
      body: fxData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Profit Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Profit Summary', 14, yPos);
    yPos += 8;
    
    const profitData = [
      ['Client Invoice', formatCurrency(shipment.costs.client_invoice_zar)],
      ['Gross Profit', formatCurrency(shipment.costs.gross_profit_zar || 0)],
      ['FX Commission (1.4%)', formatCurrency(shipment.costs.fx_commission_zar || 0)],
      ['FX Spread Profit', formatCurrency(shipment.costs.fx_spread_profit_zar || 0)],
      ['Bank Charges', `-${formatCurrency(shipment.costs.bank_charges)}`],
      ['Net Profit', formatCurrency(shipment.costs.net_profit_zar || 0)],
      ['Profit Margin', formatPercentage(shipment.costs.profit_margin || 0)],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Amount']],
      body: profitData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
      didParseCell: (data) => {
        if (data.row.index === profitData.length - 2 && data.column.index === 1) {
          const netProfit = shipment.costs?.net_profit_zar || 0;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = netProfit >= 0 ? [22, 163, 74] : [220, 38, 38];
        }
      },
    });
  }
  
  addFooter(doc);
  doc.save(`LOT_${shipment.lot_number}_Report.pdf`);
};

// Export supplier ledger statement
export const exportSupplierLedgerPDF = (
  supplier: SupplierData,
  ledgerEntries: LedgerEntry[]
) => {
  const doc = new jsPDF();
  const currency = asCurrency(supplier.currency);
  
  let yPos = addHeader(doc, 'Supplier Ledger Statement', supplier.name);
  
  // Supplier Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Supplier Details', 14, yPos);
  yPos += 8;
  
  const supplierInfo = [
    ['Name', supplier.name],
    ['Currency', supplier.currency],
    ['Contact Person', supplier.contact_person || '-'],
    ['Email', supplier.email || '-'],
    ['Phone', supplier.phone || '-'],
    ['Current Balance', `${currency} ${formatCurrency(supplier.current_balance, currency, { showSymbol: false })}`],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: supplierInfo,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 100 },
    },
    styles: { fontSize: 10 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Ledger Entries
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction History', 14, yPos);
  yPos += 8;
  
  const ledgerData = ledgerEntries.map(entry => [
    format(new Date(entry.transaction_date), 'dd MMM yyyy'),
    entry.lot_number || '-',
    entry.description || '-',
    entry.ledger_type === 'debit' 
      ? `${currency} ${formatCurrency(entry.amount, currency, { showSymbol: false })}` 
      : '-',
    entry.ledger_type === 'credit' 
      ? `${currency} ${formatCurrency(entry.amount, currency, { showSymbol: false })}` 
      : '-',
    entry.balance_after !== null 
      ? `${currency} ${formatCurrency(entry.balance_after, currency, { showSymbol: false })}`
      : '-',
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'LOT', 'Description', 'Debit', 'Credit', 'Balance']],
    body: ledgerData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 25 },
      2: { cellWidth: 50 },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
  });
  
  addFooter(doc);
  doc.save(`Supplier_Ledger_${supplier.name.replace(/\s+/g, '_')}.pdf`);
};

// Export profit report for multiple shipments
export const exportProfitReportPDF = (
  shipments: ShipmentData[],
  dateRange?: { from: Date; to: Date }
) => {
  const doc = new jsPDF('landscape');
  
  const subtitle = dateRange 
    ? `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`
    : 'All Shipments';
  
  let yPos = addHeader(doc, 'Profit Report', subtitle);
  
  // Summary Stats
  const totalRevenue = shipments.reduce((sum, s) => sum + (s.costs?.client_invoice_zar || 0), 0);
  const totalCost = shipments.reduce((sum, s) => sum + (s.costs?.total_zar || 0), 0);
  const totalNetProfit = shipments.reduce((sum, s) => sum + (s.costs?.net_profit_zar || 0), 0);
  const avgMargin = shipments.length > 0 
    ? shipments.reduce((sum, s) => sum + (s.costs?.profit_margin || 0), 0) / shipments.length 
    : 0;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, yPos);
  yPos += 6;
  
  const summaryData = [
    ['Total Shipments', String(shipments.length)],
    ['Total Revenue', formatCurrency(totalRevenue)],
    ['Total Cost', formatCurrency(totalCost)],
    ['Total Net Profit', formatCurrency(totalNetProfit)],
    ['Average Margin', formatPercentage(avgMargin)],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: summaryData,
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 40 },
    },
    styles: { fontSize: 10 },
    tableWidth: 100,
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  // Shipments Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Shipment Details', 14, yPos);
  yPos += 6;
  
  const tableData = shipments.map(s => [
    s.lot_number,
    s.supplier_name || '-',
    s.client_name || '-',
    s.eta ? format(new Date(s.eta), 'dd MMM') : '-',
    s.status.replace('-', ' '),
    formatCurrency(s.costs?.total_zar || 0),
    formatCurrency(s.costs?.client_invoice_zar || 0),
    formatCurrency(s.costs?.net_profit_zar || 0),
    formatPercentage(s.costs?.profit_margin || 0),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['LOT', 'Supplier', 'Client', 'ETA', 'Status', 'Cost (ZAR)', 'Invoice (ZAR)', 'Net Profit', 'Margin']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
    styles: { fontSize: 8 },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.column.index === 7 && data.section === 'body') {
        const rowIndex = data.row.index;
        const profit = shipments[rowIndex]?.costs?.net_profit_zar || 0;
        data.cell.styles.textColor = profit >= 0 ? [22, 163, 74] : [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  
  addFooter(doc);
  doc.save(`Profit_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
