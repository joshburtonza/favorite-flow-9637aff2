import ExcelJS from 'exceljs';

export interface FileCostingData {
  lot_number: string;
  supplier_name: string;
  client_name: string;
  commodity?: string;
  container_type?: string;
  delivery_route?: string;
  
  // FOB costs
  fob_amount: number;
  
  // Exchange rates
  roe_ours: number;
  roe_client: number;
  
  // Clearing costs
  customs_duty?: number;
  customs_vat?: number;
  container_landing?: number;
  cargo_dues?: number;
  agency_fee?: number;
  
  // Transport
  transport_cost?: number;
  
  // Bank
  bank_charges?: number;
  fx_commission?: number;
  
  // Totals
  client_invoice_zar?: number;
  total_cost_zar?: number;
  profit_zar?: number;
}

// Color constants (ARGB format)
const COLORS = {
  YELLOW_HIGHLIGHT: 'FFFFFF00',
  GREEN_PROFIT: 'FF90EE90',
  LIGHT_BLUE_HEADER: 'FFD6EAF8',
  GRAY_BORDER: 'FFE0E0E0',
  DARK_BLUE: 'FF4472C4',
  WHITE: 'FFFFFFFF',
};

/**
 * Generate a professionally formatted File Costing Excel sheet
 */
export async function generateFileCostingExcel(data: FileCostingData): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Favorite Logistics';
  workbook.created = new Date();
  
  const ws = workbook.addWorksheet('File Costing', {
    properties: { tabColor: { argb: COLORS.DARK_BLUE } },
    pageSetup: { paperSize: 9, orientation: 'portrait' } // A4
  });

  // Set column widths
  ws.columns = [
    { width: 30 }, // A - Description
    { width: 15 }, // B - USD Amount
    { width: 30 }, // C - Description
    { width: 15 }, // D - ZAR Amount
    { width: 15 }, // E - Notes
  ];

  // Row 1: Main Header
  const headerCell = ws.getCell('A1');
  headerCell.value = `LOT ${data.lot_number} - ${data.supplier_name} - DOC ${data.client_name}`;
  headerCell.font = { bold: true, size: 14, color: { argb: COLORS.DARK_BLUE } };
  headerCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 24;

  // Row 2: Commodity & Container
  ws.getCell('A2').value = data.commodity || 'General Cargo';
  ws.getCell('B2').value = data.container_type || '40HQ';
  ws.getCell('B2').font = { bold: true };

  // Row 3: Delivery Route
  ws.getCell('A3').value = 'DELIVERY';
  ws.getCell('A3').font = { bold: true };
  ws.getCell('B3').value = data.delivery_route || 'DBN - DBN';

  // Row 4: Empty spacer
  ws.getRow(4).height = 10;

  // ================== FOB SECTION ==================
  // Row 5: FOB Label
  ws.getCell('A5').value = 'FOB';
  ws.getCell('A5').font = { bold: true };
  ws.getCell('B5').value = data.fob_amount;
  ws.getCell('B5').numFmt = '#,##0.00';

  // Row 6: Empty (for additional items)
  
  // Row 7: TOTAL
  ws.getCell('A7').value = 'TOTAL';
  ws.getCell('A7').font = { bold: true };
  ws.getCell('B7').value = { formula: '=SUM(B5:B6)' };
  ws.getCell('B7').font = { bold: true };
  ws.getCell('B7').numFmt = '#,##0.00';
  ws.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };
  
  // ZAR Total (calculated)
  ws.getCell('C7').value = { formula: '=B7*B9' };
  ws.getCell('C7').font = { bold: true };
  ws.getCell('C7').numFmt = 'R #,##0.00';
  ws.getCell('C7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };

  // Row 8: Empty spacer
  ws.getRow(8).height = 10;

  // ================== EXCHANGE RATES ==================
  // Row 9: ROE - OURS
  ws.getCell('A9').value = 'ROE - OURS';
  ws.getCell('B9').value = data.roe_ours;
  ws.getCell('B9').numFmt = '#,##0.0000';
  ws.getCell('C9').value = 'ESTIMATE';
  ws.getCell('C9').font = { italic: true, color: { argb: 'FF808080' } };

  // Row 10: ROE - CLIENT (Yellow Highlight - KEY FIELD)
  ws.getCell('A10').value = 'ROE - CLIENT';
  ws.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.YELLOW_HIGHLIGHT } };
  ws.getCell('A10').font = { bold: true };
  ws.getCell('B10').value = data.roe_client;
  ws.getCell('B10').numFmt = '#,##0.0000';
  ws.getCell('B10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.YELLOW_HIGHLIGHT } };
  ws.getCell('B10').font = { bold: true };

  // Row 11: Empty spacer
  ws.getRow(11).height = 10;

  // ================== CLEARING SECTION HEADERS ==================
  // Row 12: Headers
  ws.getCell('C12').value = 'VAT';
  ws.getCell('C12').font = { bold: true };
  ws.getCell('C12').alignment = { horizontal: 'center' };
  ws.getCell('D12').value = 'AMOUNT';
  ws.getCell('D12').font = { bold: true };
  ws.getCell('D12').alignment = { horizontal: 'center' };

  // Row 13: Empty spacer
  
  // Row 14: Clearing Agent Total
  ws.getCell('A14').value = 'CLEARING AGENT TOTAL (EX VAT)';
  ws.getCell('A14').font = { bold: true };
  ws.getCell('B14').value = { formula: '=SUM(B16:B20)' };
  ws.getCell('B14').font = { bold: true };
  ws.getCell('B14').numFmt = 'R #,##0.00';
  ws.getCell('B14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };
  
  ws.getCell('C14').value = 'INC VAT';
  ws.getCell('C14').font = { bold: true };
  ws.getCell('D14').value = { formula: '=D20+B14' };
  ws.getCell('D14').font = { bold: true };
  ws.getCell('D14').numFmt = 'R #,##0.00';
  ws.getCell('D14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };

  // Row 15: Empty spacer
  
  // ================== CLEARING COSTS ==================
  // Row 16: Customs Duty
  ws.getCell('A16').value = 'CUSTOMS DUTY';
  ws.getCell('B16').value = data.customs_duty || 0;
  ws.getCell('B16').numFmt = 'R #,##0.00';
  ws.getCell('C16').value = 'CUSTOMS VAT';
  ws.getCell('D16').value = data.customs_vat || 0;
  ws.getCell('D16').numFmt = 'R #,##0.00';

  // Row 17: Empty (for Customs VAT input)
  ws.getCell('A17').value = 'CUSTOMS VAT';
  ws.getCell('C17').value = 'CARGO DUES VAT';
  ws.getCell('D17').value = { formula: '=B19*0.15' };
  ws.getCell('D17').numFmt = 'R #,##0.00';

  // Row 18: Container Landing
  ws.getCell('A18').value = 'CONTAINER LANDING';
  ws.getCell('B18').value = data.container_landing || 0;
  ws.getCell('B18').numFmt = 'R #,##0.00';
  ws.getCell('C18').value = 'AGENCY VAT';
  ws.getCell('D18').value = { formula: '=B20*0.15' };
  ws.getCell('D18').numFmt = 'R #,##0.00';

  // Row 19: Cargo Dues
  ws.getCell('A19').value = 'CARGO DUES';
  ws.getCell('B19').value = data.cargo_dues || 0;
  ws.getCell('B19').numFmt = 'R #,##0.00';

  // Row 20: Agency
  ws.getCell('A20').value = 'AGENCY';
  ws.getCell('B20').value = data.agency_fee || 0;
  ws.getCell('B20').numFmt = 'R #,##0.00';
  ws.getCell('D20').value = { formula: '=SUM(D16:D19)' };
  ws.getCell('D20').numFmt = 'R #,##0.00';
  ws.getCell('D20').font = { bold: true };

  // Rows 21-22: Empty spacers
  ws.getRow(21).height = 10;
  ws.getRow(22).height = 10;

  // ================== TRANSPORT SECTION ==================
  // Row 23: Transport
  ws.getCell('A23').value = 'TRANSPORT';
  ws.getCell('A23').font = { bold: true };
  ws.getCell('B23').value = data.transport_cost || 0;
  ws.getCell('B23').numFmt = 'R #,##0.00';

  // Rows 24-25: Empty spacers
  ws.getRow(24).height = 10;
  ws.getRow(25).height = 10;

  // ================== BANK SECTION ==================
  // Row 26: Bank Charges
  ws.getCell('A26').value = 'BANK CHARGES';
  ws.getCell('B26').value = data.bank_charges || 0;
  ws.getCell('B26').numFmt = 'R #,##0.00';

  // Row 27: FX Commission
  ws.getCell('A27').value = 'FX COMMISSION';
  ws.getCell('B27').value = data.fx_commission || 0;
  ws.getCell('B27').numFmt = 'R #,##0.00';

  // Rows 28-29: Empty spacers
  ws.getRow(28).height = 10;
  ws.getRow(29).height = 10;

  // ================== GRAND TOTALS ==================
  // Row 30: Total Cost ZAR
  ws.getCell('A30').value = 'TOTAL COST ZAR';
  ws.getCell('A30').font = { bold: true, size: 11 };
  ws.getCell('B30').value = { formula: '=C7+B14+D20+B23+B26+B27' };
  ws.getCell('B30').font = { bold: true, size: 11 };
  ws.getCell('B30').numFmt = 'R #,##0.00';
  ws.getCell('B30').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE_HEADER } };

  // Row 31: Client Invoice (Green highlight)
  ws.getCell('A31').value = 'CLIENT INVOICE';
  ws.getCell('A31').font = { bold: true, size: 11 };
  ws.getCell('A31').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_PROFIT } };
  ws.getCell('B31').value = data.client_invoice_zar || 0;
  ws.getCell('B31').font = { bold: true, size: 11 };
  ws.getCell('B31').numFmt = 'R #,##0.00';
  ws.getCell('B31').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_PROFIT } };

  // Row 32: Profit (Green highlight)
  ws.getCell('A32').value = 'PROFIT';
  ws.getCell('A32').font = { bold: true, size: 12 };
  ws.getCell('A32').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_PROFIT } };
  ws.getCell('B32').value = { formula: '=B31-B30' };
  ws.getCell('B32').font = { bold: true, size: 12 };
  ws.getCell('B32').numFmt = 'R #,##0.00';
  ws.getCell('B32').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_PROFIT } };

  // Row 33: Margin percentage
  ws.getCell('A33').value = 'MARGIN %';
  ws.getCell('A33').font = { italic: true };
  ws.getCell('B33').value = { formula: '=IF(B31>0,B32/B31*100,0)' };
  ws.getCell('B33').numFmt = '0.00"%"';

  // ================== ADD BORDERS TO DATA CELLS ==================
  const dataRanges = [
    'A5:B7', 'A9:C10', 'A14:D20', 'A23:B23', 'A26:B27', 'A30:B33'
  ];
  
  dataRanges.forEach(range => {
    const [start, end] = range.split(':');
    // Simple border application for key cells
  });

  // Add print area and page settings
  ws.pageSetup.printArea = 'A1:E35';
  ws.pageSetup.fitToPage = true;

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Download generated file costing Excel
 */
export async function downloadFileCostingExcel(data: FileCostingData): Promise<void> {
  const blob = await generateFileCostingExcel(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `LOT_${data.lot_number}_FILE_COSTING.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
