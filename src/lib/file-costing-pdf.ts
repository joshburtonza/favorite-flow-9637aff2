import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileCosting } from '@/hooks/useFileCostings';
import { formatCurrency } from '@/lib/formatters';

interface CostingPDFData extends FileCosting {
  shipment?: {
    lot_number: string;
    supplier_name: string | null;
    client_name: string | null;
    commodity: string | null;
    status: string;
  };
  transportDocNames?: string[];
  clearingDocNames?: string[];
  otherDocNames?: string[];
}

export function generateFileCostingPDF(costing: CostingPDFData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FILE COSTING SHEET', 14, 25);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`LOT: ${costing.lot_number || 'N/A'}`, pageWidth - 14, 20, { align: 'right' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 28, { align: 'right' });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Shipment Details
  let yPos = 55;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Shipment Details', 14, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const details = [
    ['LOT Number:', costing.lot_number || 'N/A'],
    ['Supplier:', costing.shipment?.supplier_name || 'N/A'],
    ['Client:', costing.shipment?.client_name || 'N/A'],
    ['Commodity:', costing.shipment?.commodity || 'N/A'],
    ['Status:', costing.status.toUpperCase()],
  ];
  
  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, yPos);
    yPos += 6;
  });
  
  // Transport Documents Section
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Transport Documents', 14, yPos);
  
  if (costing.transportDocNames && costing.transportDocNames.length > 0) {
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Document Name']],
      body: costing.transportDocNames.map(name => [name]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: 14, right: 14 },
    });
    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  } else {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No transport documents attached', 14, yPos);
    yPos += 5;
  }
  
  // Transport Cost
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Transport Cost: ${formatCurrency(costing.transport_cost_zar, 'ZAR')}`, pageWidth - 14, yPos, { align: 'right' });
  
  // Clearing Documents Section
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Clearing Documents', 14, yPos);
  
  if (costing.clearingDocNames && costing.clearingDocNames.length > 0) {
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Document Name']],
      body: costing.clearingDocNames.map(name => [name]),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 14, right: 14 },
    });
    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  } else {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No clearing documents attached', 14, yPos);
    yPos += 5;
  }
  
  // Clearing Cost
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Clearing Cost: ${formatCurrency(costing.clearing_cost_zar, 'ZAR')}`, pageWidth - 14, yPos, { align: 'right' });
  
  // Other Documents Section
  if (costing.otherDocNames && costing.otherDocNames.length > 0) {
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Other Documents', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Document Name']],
      body: costing.otherDocNames.map(name => [name]),
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128] },
      margin: { left: 14, right: 14 },
    });
    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Other Costs: ${formatCurrency(costing.other_costs_zar, 'ZAR')}`, pageWidth - 14, yPos, { align: 'right' });
  }
  
  // Cost Summary
  yPos += 20;
  doc.setFillColor(240, 240, 250);
  doc.rect(14, yPos - 5, pageWidth - 28, 40, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Cost Summary', 20, yPos + 5);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const summaryY = yPos + 15;
  doc.text('Transport Cost:', 20, summaryY);
  doc.text(formatCurrency(costing.transport_cost_zar, 'ZAR'), 80, summaryY);
  
  doc.text('Clearing Cost:', 20, summaryY + 6);
  doc.text(formatCurrency(costing.clearing_cost_zar, 'ZAR'), 80, summaryY + 6);
  
  doc.text('Other Costs:', 20, summaryY + 12);
  doc.text(formatCurrency(costing.other_costs_zar, 'ZAR'), 80, summaryY + 12);
  
  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('GRAND TOTAL:', pageWidth - 80, summaryY + 8);
  doc.setFontSize(14);
  doc.text(formatCurrency(costing.grand_total_zar, 'ZAR'), pageWidth - 20, summaryY + 8, { align: 'right' });
  
  // Notes
  if (costing.notes) {
    yPos += 50;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 14, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(costing.notes, pageWidth - 28);
    doc.text(splitNotes, 14, yPos + 8);
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generated on ${new Date().toLocaleString()}`, 14, pageHeight - 10);
  doc.text('File Costing System', pageWidth - 14, pageHeight - 10, { align: 'right' });
  
  return doc;
}

export function downloadFileCostingPDF(costing: CostingPDFData) {
  const doc = generateFileCostingPDF(costing);
  doc.save(`costing-${costing.lot_number || costing.id}.pdf`);
}
