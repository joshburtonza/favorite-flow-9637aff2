// Workspace Template Definitions
// Each template generates a pre-populated spreadsheet with labels, formatting, and structure

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontColor?: string;
  bgColor?: string;
  alignment?: 'left' | 'center' | 'right';
  numFmt?: string;
}

export interface TemplateRow {
  cells: (string | null)[];
  styles?: (CellStyle | null)[];
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'logistics' | 'property' | 'finance';
  columns: { name: string; width: number }[];
  rows: TemplateRow[];
}

// Style shortcuts
const S = {
  bold: { bold: true } as CellStyle,
  boldRight: { bold: true, alignment: 'right' as const } as CellStyle,
  right: { alignment: 'right' as const } as CellStyle,
  title: { bold: true, fontSize: 16 } as CellStyle,
  yellow: { bgColor: 'FFFF00' } as CellStyle,
  yellowBold: { bold: true, bgColor: 'FFFF00' } as CellStyle,
  yellowBoldRight: { bold: true, bgColor: 'FFFF00', alignment: 'right' as const } as CellStyle,
  blueGrey: { fontSize: 16, bgColor: 'D9E2F3' } as CellStyle,
  blueGreyRight: { fontSize: 16, bgColor: 'D9E2F3', alignment: 'right' as const } as CellStyle,
  smallBold: { bold: true, fontSize: 9 } as CellStyle,
  small: { fontSize: 9 } as CellStyle,
  smallRight: { fontSize: 9, alignment: 'right' as const } as CellStyle,
  smallBoldRight: { bold: true, fontSize: 9, alignment: 'right' as const } as CellStyle,
  greyBg: { bgColor: 'F2F2F2' } as CellStyle,
  greyBgRight: { bgColor: 'F2F2F2', alignment: 'right' as const } as CellStyle,
  med: { fontSize: 10 } as CellStyle,
  medBold: { bold: true, fontSize: 10 } as CellStyle,
  large: { fontSize: 18 } as CellStyle,
  xlBold: { bold: true, fontSize: 20 } as CellStyle,
  xxlBold: { bold: true, fontSize: 24 } as CellStyle,
};

// ─── TEMPLATE 1: FILE COST SHEET ───

const fileCostSheet: WorkspaceTemplate = {
  id: 'file-cost-sheet',
  name: 'File Cost Sheet',
  description: 'Import shipment cost breakdown — customs, freight, transport, clearing charges. Used 35-45x per month.',
  icon: 'Ship',
  category: 'logistics',
  columns: [
    { name: 'A', width: 350 },
    { name: 'B', width: 225 },
    { name: 'C', width: 285 },
    { name: 'D', width: 160 },
  ],
  rows: [
    // Row 0: Title
    { cells: ['LOT ___ - SUPPLIER - CLIENT - NUNSOFAST', null, null, null], styles: [S.title, null, null, null] },
    // Row 1
    { cells: ['FABRIC', '40HQ', null, null], styles: [null, null, null, null] },
    // Row 2
    { cells: ['DELIVERY', 'DBN - DBN', null, null], styles: [null, null, null, null] },
    // Row 3: spacer
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 4
    { cells: ['FOB', null, null, null], styles: [null, null, null, null] },
    // Row 5: spacer
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 6: TOTAL
    { cells: ['TOTAL', '$ 0.00', 'R 0.00', null], styles: [S.bold, S.boldRight, S.boldRight, null] },
    // Row 7: spacer
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 8
    { cells: ['ROE - OURS', null, 'ESTIMATE', null], styles: [null, null, null, null] },
    // Row 9: YELLOW row
    { cells: ['ROE - CLIENT', null, null, null], styles: [S.yellow, S.yellow, S.yellow, S.yellow] },
    // Row 10-12: spacers
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 13: NUNSOFAST INVOICE
    { cells: ['NUNSOFAST INVOICE TOTAL (EX VAT)', 'R 0.00', 'NUNSOFAST INVOICE TOTAL (INC VAT)', 'R 0.00'], styles: [S.bold, S.boldRight, S.bold, S.boldRight] },
    // Row 14: spacer
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 15
    { cells: ['CUSTOMS DUTY', 'R 0.00', 'CUSTOMS VAT', 'R 0.00'], styles: [null, S.right, null, S.right] },
    // Row 16
    { cells: ['CUSTOMS VAT', null, 'CARGO DUES', 'R 0.00'], styles: [null, null, null, S.right] },
    // Row 17
    { cells: ['CONTAINER LANDING', 'R 0.00', 'AGENCY', 'R 0.00'], styles: [null, S.right, null, S.right] },
    // Row 18
    { cells: ['CARGO DUES', 'R 0.00', null, null], styles: [null, S.right, null, null] },
    // Row 19
    { cells: ['AGENCY', 'R 0.00', 'VAT TOTAL', 'R 0.00'], styles: [null, S.right, S.bold, S.boldRight] },
    // Row 20: flexible row
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 21-22: spacers
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 23
    { cells: ['KELLILAH OCEAN FREIGHT', 'R 0.00', null, null], styles: [null, S.right, null, null] },
    // Row 24
    { cells: ['TRANSPORT', 'R 0.00', null, null], styles: [null, S.right, null, null] },
    // Row 25
    { cells: ['SRD (ADDITIONAL)', 'R 0.00', null, null], styles: [null, S.right, null, null] },
    // Row 26: spacer
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 27
    { cells: ['CLEARING CHARGES + FREIGHT (EX VAT)', 'R 0.00', null, null], styles: [S.bold, S.boldRight, null, null] },
    // Row 28
    { cells: ['CREDITS DUE', null, null, null], styles: [S.bold, null, null, null] },
    // Row 29: spacer
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 30: TOTAL FILE COST
    { cells: ['TOTAL FILE COST (INC VAT)', 'R 0.00', 'TOTAL FILE COST (EX VAT)', 'R 0.00'], styles: [S.blueGrey, S.blueGreyRight, S.blueGrey, S.blueGreyRight] },
    // Row 31: spacer
    { cells: [null, null, null, null], styles: [null, null, null, null] },
    // Row 32: CI AMOUNT
    { cells: ['CI AMOUNT', '$ 0.00', null, null], styles: [S.yellowBold, S.yellowBoldRight, null, null] },
    // Row 33: spacer
    { cells: [null, null, null, null], styles: [null, null, null, null] },
  ],
};

// ─── TEMPLATE 2: MAJESTIC TAX INVOICE ───

function generateInvoiceRows(isAlternating: boolean, count: number): TemplateRow[] {
  const rows: TemplateRow[] = [];
  for (let i = 0; i < count; i++) {
    const bg = isAlternating && i % 2 === 0 ? S.greyBg : null;
    const bgRight = isAlternating && i % 2 === 0 ? S.greyBgRight : S.right;
    rows.push({
      cells: [null, null, null, null, null, null, null, null, null],
      styles: [bg, bg, bg, bg, bg, bgRight, bgRight, null, null],
    });
  }
  return rows;
}

const majesticInvoice: WorkspaceTemplate = {
  id: 'majestic-tax-invoice',
  name: 'Majestic Tax Invoice',
  description: 'Client billing invoice with line items, tax calculation, and banking details for Majestic Import & Export.',
  icon: 'FileText',
  category: 'logistics',
  columns: [
    { name: 'A', width: 80 },
    { name: 'B', width: 250 },
    { name: 'C', width: 130 },
    { name: 'D', width: 120 },
    { name: 'E', width: 80 },
    { name: 'F', width: 140 },
    { name: 'G', width: 160 },
    { name: 'H', width: 80 },
    { name: 'I', width: 100 },
  ],
  rows: [
    // Row 0: Header
    { cells: [null, 'Majestic Import & Export (Pty) Ltd', null, null, null, 'TAX INVOICE', null, null, null], styles: [null, { fontSize: 20 }, null, null, null, { bold: true, fontSize: 21 }, null, null, null] },
    // Row 1: spacer
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    // Row 2
    { cells: [null, 'John Vorster Drive, Southdowns Ridge Office Park, Centurion, Pretoria 0422', null, null, null, null, null, null, null], styles: [null, S.small, null, null, null, null, null, null, null] },
    // Row 3
    { cells: [null, 'VAT REG : 462 028 0422', null, null, null, null, null, null, null], styles: [null, S.small, null, null, null, null, null, null, null] },
    // Row 4
    { cells: [null, 'Tel : 012 003 3270', null, null, null, null, null, null, null], styles: [null, S.small, null, null, null, null, null, null, null] },
    // Row 5
    { cells: [null, 'email: majesticimportandexport439@gmail.com', null, null, null, null, null, null, null], styles: [null, S.small, null, null, null, null, null, null, null] },
    // Row 6-7: spacers
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    // Row 8: BILL TO / Invoice No
    { cells: [null, 'BILL TO', null, null, null, 'Invoice No:', null, null, null], styles: [null, S.smallBold, null, null, null, S.smallBold, null, null, null] },
    // Row 9: Client name / Invoice Date
    { cells: [null, '(Client Name)', null, null, null, 'Invoice Date:', null, null, null], styles: [null, S.med, null, null, null, S.smallBold, null, null, null] },
    // Row 10-11: Address
    { cells: [null, '(Address Line 1)', null, null, null, null, null, null, null], styles: [null, S.small, null, null, null, null, null, null, null] },
    { cells: [null, '(Address Line 2)', null, null, null, null, null, null, null], styles: [null, S.small, null, null, null, null, null, null, null] },
    // Row 12: Post code / Order #
    { cells: [null, '(Post Code)', null, null, null, 'ORDER #:', null, null, 'EX'], styles: [null, S.small, null, null, null, S.smallBold, null, null, null] },
    // Row 13: Client VAT
    { cells: [null, '(Client VAT Number)', null, null, null, null, null, null, null], styles: [null, S.small, null, null, null, null, null, null, null] },
    // Row 14: Column headers
    { cells: [null, 'DESCRIPTION', null, null, 'QTY', 'UNIT PRICE', 'TOTAL', null, 'FACTOR'], styles: [null, S.smallBold, null, null, S.smallBold, S.smallBold, S.smallBold, null, S.smallBold] },
    // Row 15: spacer
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    // Rows 16-45: 30 line item rows with alternating backgrounds
    ...generateInvoiceRows(true, 30),
    // Row 46-47: spacers
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    // Row 48: Total qty
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, S.small, null, null, null, null] },
    // Row 49: Payment terms / Subtotal
    { cells: [null, 'PAYMENT TERMS 60 DAYS FROM DATE OF DELIVERY', null, null, null, 'SUBTOTAL', 'R 0.00', null, null], styles: [null, S.smallBold, null, null, null, { bold: true, fontSize: 8 }, S.smallRight, null, null] },
    // Row 50: Thank you
    { cells: [null, 'Thank you for your business!', null, null, null, null, null, null, null], styles: [null, S.med, null, null, null, null, null, null, null] },
    // Row 51: Banking header
    { cells: [null, 'Majestic Import & Export Banking Details:', null, null, null, null, null, null, null], styles: [null, S.medBold, null, null, null, null, null, null, null] },
    // Row 52: Bank details / Tax rate
    { cells: [null, 'NEDBANK : 1321 319 215', null, null, null, 'TAX RATE', '0.15', null, null], styles: [null, S.medBold, null, null, null, { bold: true, fontSize: 8 }, S.small, null, null] },
    // Row 53: Branch / Total Tax
    { cells: [null, 'Branch : 198 765', null, null, null, 'TOTAL TAX', 'R 0.00', null, null], styles: [null, S.medBold, null, null, null, { bold: true, fontSize: 8 }, S.smallRight, null, null] },
    // Row 54: spacer
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    // Row 55: LOT reference / Balance Due
    { cells: [null, '(LOT Reference)', null, null, null, 'Balance Due', 'R 0.00', null, null], styles: [null, S.large, null, null, null, S.bold, { bold: true, fontSize: 10, alignment: 'right' as const }, null, null] },
  ],
};

// ─── TEMPLATE 2B: CLEVELAND TAX INVOICE ───

const clevelandInvoice: WorkspaceTemplate = {
  id: 'cleveland-tax-invoice',
  name: 'Cleveland Tax Invoice',
  description: 'Client billing invoice for Cleveland Investments (Pty) Ltd with yellow banking details.',
  icon: 'FileText',
  category: 'logistics',
  columns: [...majesticInvoice.columns],
  rows: majesticInvoice.rows.map((row, idx) => {
    if (idx === 0) {
      return {
        cells: ['CLEVELAND INVESTMENTS (PTY) LTD', null, null, null, null, 'TAX INVOICE', null, null, null],
        styles: [S.xxlBold, null, null, null, null, { bold: true, fontSize: 21 }, null, null, null],
      };
    }
    if (idx === 2) {
      return {
        cells: [null, 'Vat Reg : 455 029 0136   Company Reg : 2015/354289/07', null, null, null, null, null, null, null],
        styles: [null, S.small, null, null, null, null, null, null, null],
      };
    }
    if (idx === 3) {
      return {
        cells: [null, 'John Vorster Drive', null, null, null, null, null, null, null],
        styles: [null, S.small, null, null, null, null, null, null, null],
      };
    }
    if (idx === 4) {
      return {
        cells: [null, 'Southdowns Ridge Office Park, Centurion, Pretoria 006', null, null, null, null, null, null, null],
        styles: [null, S.small, null, null, null, null, null, null, null],
      };
    }
    if (idx === 5) {
      return {
        cells: [null, 'Email: clevelandinvestments3@gmail.com', null, null, null, null, null, null, null],
        styles: [null, S.small, null, null, null, null, null, null, null],
      };
    }
    // Banking rows (51-53 in the template)
    const bankingRowStart = 16 + 30 + 2 + 3; // line items start + count + spacers + offset = row index 51
    if (idx === bankingRowStart) {
      return {
        cells: [null, 'CLEVELAND INVESTMENTS PTY LTD BANKING DETAILS', null, null, null, null, null, null, null],
        styles: [null, { bold: true, fontSize: 10, bgColor: 'FFFF00' }, null, null, null, null, null, null, null],
      };
    }
    if (idx === bankingRowStart + 1) {
      return {
        cells: [null, 'NEDBANK ACCOUNT NUMBER : 1323 1890 92', null, null, null, 'TAX RATE', '0.15', null, null],
        styles: [null, { bold: true, fontSize: 10, bgColor: 'FFFF00' }, null, null, null, { bold: true, fontSize: 8 }, S.small, null, null],
      };
    }
    if (idx === bankingRowStart + 2) {
      return {
        cells: [null, 'BRANCH : 198 765', null, null, null, 'TOTAL TAX', 'R 0.00', null, null],
        styles: [null, { bold: true, fontSize: 10, bgColor: 'FFFF00' }, null, null, null, { bold: true, fontSize: 8 }, S.smallRight, null, null],
      };
    }
    return row;
  }),
};

// ─── TEMPLATE 3: MONTHLY RENTAL REPORT ───

interface PropertyConfig {
  name: string;
  agency: string;
  bgColor?: string;
}

function generatePropertyBlock(prop: PropertyConfig): TemplateRow[] {
  const bg = prop.bgColor ? { bgColor: prop.bgColor } as CellStyle : null;
  const bgRight = prop.bgColor ? { bgColor: prop.bgColor, alignment: 'right' as const } as CellStyle : null;
  
  return [
    // Property row
    {
      cells: [prop.name, null, null, prop.agency, null, null, null, null, null],
      styles: [bg, bg, bg, bg, bg, bg, bgRight, bg, bgRight],
    },
    // REPAIRS/COMPLAINTS label
    {
      cells: ['REPAIRS / COMPLAINTS:', null, null, null, null, null, null, null, null],
      styles: [S.small, null, null, null, null, null, null, null, null],
    },
    // Notes area (empty)
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    // Spacer
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
  ];
}

const properties: PropertyConfig[] = [
  { name: 'OCEANDUNE UNIT 234', agency: 'APARTMENT BOX', bgColor: 'F2F2F2' },
  { name: 'OCEANDUNE UNIT 409', agency: 'APARTMENT BOX', bgColor: 'FFFF00' },
  { name: 'DUNDEE FLAT UNIT 1/NANDOS', agency: 'DORMEHL', bgColor: 'F2F2F2' },
  { name: 'DUNDEE FLAT UNIT 2', agency: 'DORMEHL', bgColor: 'F2F2F2' },
  { name: 'NANDOS DUNDEE', agency: 'DORMEHL' },
  { name: 'CURTAINS & LINEN DUNDEE/NANDOS', agency: 'DORMEHL' },
  { name: 'DUNDEE DISCOUNT SHOP/NANDOS', agency: 'DORMEHL' },
  { name: 'COMPUTER SOLU DUNDEE / NANDOS', agency: 'N/A' },
  { name: 'TELECARE & SONS', agency: 'ALLIED' },
  { name: 'N.N DR. MDAKANE', agency: 'N/A' },
  { name: 'BEST BUILD N.N KIRKLAND', agency: 'N/A' },
  { name: 'FLAT N.N PATERSON STR', agency: 'ALLIED' },
  { name: '3-9 SHUTTER RD-GLENWOOD (J)', agency: 'N/A', bgColor: 'F2F2F2' },
  { name: '182 KENNILWORTH - JAVED', agency: 'N/A', bgColor: 'F2F2F2' },
  { name: 'CARTER HOUSE JAVED', agency: 'N/A', bgColor: 'F2F2F2' },
  { name: 'NEXT TO CARTER HOUSE - JAVED', agency: 'N/A' },
  { name: 'MOZAMBIQUE PROPERTY', agency: '', bgColor: 'F2F2F2' },
];

const monthlyRentalReport: WorkspaceTemplate = {
  id: 'monthly-rental-report',
  name: 'Monthly Rental Report',
  description: 'Track 17 rental properties — deposits, rent, agencies, repairs, and shortfall. Monthly recurring.',
  icon: 'Building2',
  category: 'property',
  columns: [
    { name: 'A', width: 300 },
    { name: 'B', width: 120 },
    { name: 'C', width: 130 },
    { name: 'D', width: 130 },
    { name: 'E', width: 110 },
    { name: 'F', width: 110 },
    { name: 'G', width: 130 },
    { name: 'H', width: 120 },
    { name: 'I', width: 120 },
  ],
  rows: [
    // Row 0: Title
    { cells: ['MONTHLY PROPERTY REPORT', null, null, null, null, null, null, null, null], styles: [{ fontSize: 20 }, null, null, null, null, null, null, null, null] },
    // Row 1: Date
    { cells: ['(Month Year)', null, null, null, null, null, null, null, null], styles: [S.large, null, null, null, null, null, null, null, null] },
    // Row 2: Column headers
    {
      cells: ['NAME OF PROPERTY', 'DEPOSIT PAID', 'RENT AGREEMENT', 'AGENCIES', 'LEASE START', 'LEASE END', 'RENT PAID TO US', 'DATE PAYED', 'SHORT PAYED'],
      styles: Array(9).fill({ bold: true, fontSize: 10 } as CellStyle),
    },
    // Row 3: spacer
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    // Property blocks
    ...properties.flatMap(p => generatePropertyBlock(p)),
    // After all properties: spacer
    { cells: [null, null, null, null, null, null, null, null, null], styles: [null, null, null, null, null, null, null, null, null] },
    // Headers row
    { cells: [null, null, null, null, null, null, 'INCOME', null, 'LOSS'], styles: [null, null, null, null, null, null, S.bold, null, S.bold] },
    // Totals row
    { cells: ['TOTALS', null, null, null, null, null, 'R 0.00', null, 'R 0.00'], styles: [S.bold, null, null, null, null, null, S.greyBgRight, null, S.right] },
  ],
};

// ─── EXPORT ALL TEMPLATES ───

export const workspaceTemplates: WorkspaceTemplate[] = [
  fileCostSheet,
  majesticInvoice,
  clevelandInvoice,
  monthlyRentalReport,
];
