import ExcelJS from 'exceljs';
import Papa from 'papaparse';

export interface ExcelImportResult {
  data: Record<string, any>[];
  columns: string[];
  styles?: Record<string, any>[];
}

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  includeStyles?: boolean;
  columns?: { key: string; header: string; width?: number }[];
}

// Import Excel file with formatting
export async function importExcel(file: File): Promise<ExcelImportResult> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheets found in the file');
  }
  
  const data: Record<string, any>[] = [];
  const columns: string[] = [];
  const styles: Record<string, any>[] = [];
  
  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    columns.push(String(cell.value || `Column ${colNumber}`));
  });
  
  // Get data rows
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const rowData: Record<string, any> = {};
    const rowStyles: Record<string, any> = {};
    
    row.eachCell((cell, colNumber) => {
      const colName = columns[colNumber - 1];
      if (colName) {
        rowData[colName] = cell.value;
        
        // Extract cell styling
        rowStyles[colName] = {
          font: cell.font,
          fill: cell.fill,
          border: cell.border,
          numFmt: cell.numFmt,
          alignment: cell.alignment,
        };
      }
    });
    
    data.push(rowData);
    styles.push(rowStyles);
  });
  
  return { data, columns, styles };
}

// Export data to Excel with formatting
export async function exportExcel(
  data: Record<string, any>[],
  options: ExcelExportOptions
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName || 'Sheet 1');
  
  // Set up columns
  if (options.columns) {
    worksheet.columns = options.columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));
  } else if (data.length > 0) {
    const keys = Object.keys(data[0]);
    worksheet.columns = keys.map(key => ({
      header: key,
      key,
      width: 15,
    }));
  }
  
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 24;
  
  // Add data rows
  data.forEach((item, index) => {
    const row = worksheet.addRow(item);
    
    // Alternate row colors
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      };
    }
    
    // Format numbers and currencies
    row.eachCell((cell, colNumber) => {
      const value = cell.value;
      if (typeof value === 'number') {
        // Check if it looks like currency (has 2 decimal places or is large)
        if (value > 100 || Number.isInteger(value * 100)) {
          cell.numFmt = '#,##0.00';
        }
      }
      if (value instanceof Date) {
        cell.numFmt = 'yyyy-mm-dd';
      }
    });
  });
  
  // Auto-fit columns (approximate)
  worksheet.columns.forEach(column => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value?.toString() || '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });
  
  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

// Import CSV file
export function importCSV(file: File): Promise<ExcelImportResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true,
      complete: (results) => {
        resolve({
          data: results.data,
          columns: results.meta.fields || [],
        });
      },
      error: (error) => reject(error),
    });
  });
}

// Export to CSV
export function exportCSV(
  data: Record<string, any>[],
  filename: string
): Blob {
  const csv = Papa.unparse(data);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

// Download blob as file
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format currency value
export function formatCurrency(
  value: number | string | null | undefined,
  currency: 'ZAR' | 'USD' | 'EUR' | 'GBP' = 'ZAR'
): string {
  if (value === null || value === undefined) return '';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  
  const symbols: Record<string, string> = {
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  
  return `${symbols[currency]}${num.toLocaleString('en-ZA', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}
