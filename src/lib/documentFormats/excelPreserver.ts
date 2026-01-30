import ExcelJS from 'exceljs';

export interface CellFormat {
  value: any;
  formula?: string;
  font?: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    color?: string;
    name?: string;
  };
  fill?: {
    type: 'pattern';
    pattern: 'solid';
    fgColor: string;
  };
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
  border?: {
    top?: { style: string; color: string };
    bottom?: { style: string; color: string };
    left?: { style: string; color: string };
    right?: { style: string; color: string };
  };
  numFmt?: string;
}

export interface SheetStructure {
  name: string;
  columns: { width: number; key: string }[];
  rows: {
    height?: number;
    cells: Record<string, CellFormat>;
  }[];
  mergedCells: string[];
}

export interface FormatMetadata {
  sheets: number;
  total_rows: number;
  has_formulas: boolean;
  has_formatting: boolean;
  has_merged_cells: boolean;
  color_palette: string[];
}

/**
 * Parse an Excel file and extract complete formatting
 */
export async function parseExcelWithFormatting(
  buffer: ArrayBuffer
): Promise<{ structure: SheetStructure[]; metadata: FormatMetadata }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: SheetStructure[] = [];
  const colorPalette = new Set<string>();
  let hasFormulas = false;
  let hasFormatting = false;
  let hasMergedCells = false;

  workbook.eachSheet((worksheet) => {
    const sheet: SheetStructure = {
      name: worksheet.name,
      columns: [],
      rows: [],
      mergedCells: []
    };

    // Extract column widths
    worksheet.columns.forEach((col, index) => {
      sheet.columns.push({
        width: col.width || 10,
        key: col.key || `col_${index}`
      });
    });

    // Extract merged cells
    if (worksheet.model.merges && worksheet.model.merges.length > 0) {
      hasMergedCells = true;
      worksheet.model.merges.forEach(merge => {
        sheet.mergedCells.push(merge);
      });
    }

    // Extract rows with formatting
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const rowData: SheetStructure['rows'][0] = {
        height: row.height,
        cells: {}
      };

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const cellRef = `${getColumnLetter(colNumber)}${rowNumber}`;
        
        const cellFormat: CellFormat = {
          value: cell.value
        };

        // Formula
        if (cell.formula) {
          cellFormat.formula = cell.formula;
          hasFormulas = true;
        }

        // Font
        if (cell.font) {
          cellFormat.font = {
            bold: cell.font.bold,
            italic: cell.font.italic,
            size: cell.font.size,
            color: cell.font.color?.argb,
            name: cell.font.name
          };
          if (cell.font.bold || cell.font.italic || cell.font.color) {
            hasFormatting = true;
          }
        }

        // Fill (background color)
        if (cell.fill && cell.fill.type === 'pattern') {
          const fill = cell.fill as ExcelJS.FillPattern;
          if (fill.fgColor?.argb) {
            cellFormat.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: fill.fgColor.argb
            };
            colorPalette.add(fill.fgColor.argb);
            hasFormatting = true;
          }
        }

        // Alignment
        if (cell.alignment) {
          cellFormat.alignment = {
            horizontal: cell.alignment.horizontal as any,
            vertical: cell.alignment.vertical as any,
            wrapText: cell.alignment.wrapText
          };
        }

        // Border
        if (cell.border) {
          cellFormat.border = {};
          ['top', 'bottom', 'left', 'right'].forEach(side => {
            const b = (cell.border as any)?.[side];
            if (b?.style) {
              (cellFormat.border as any)[side] = {
                style: b.style,
                color: b.color?.argb || '000000'
              };
            }
          });
        }

        // Number format
        if (cell.numFmt) {
          cellFormat.numFmt = cell.numFmt;
          hasFormatting = true;
        }

        rowData.cells[cellRef] = cellFormat;
      });

      sheet.rows.push(rowData);
    });

    sheets.push(sheet);
  });

  const metadata: FormatMetadata = {
    sheets: sheets.length,
    total_rows: sheets.reduce((sum, s) => sum + s.rows.length, 0),
    has_formulas: hasFormulas,
    has_formatting: hasFormatting,
    has_merged_cells: hasMergedCells,
    color_palette: Array.from(colorPalette)
  };

  return { structure: sheets, metadata };
}

/**
 * Generate Excel file from parsed structure with optional data replacement
 */
export async function generateExcelFromStructure(
  structure: SheetStructure[],
  data?: Record<string, any>
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of structure) {
    const worksheet = workbook.addWorksheet(sheet.name);

    // Set column widths
    sheet.columns.forEach((col, index) => {
      worksheet.getColumn(index + 1).width = col.width;
    });

    // Add merged cells
    sheet.mergedCells.forEach(merge => {
      worksheet.mergeCells(merge);
    });

    // Add rows with formatting
    sheet.rows.forEach((row, rowIndex) => {
      const wsRow = worksheet.getRow(rowIndex + 1);
      
      if (row.height) {
        wsRow.height = row.height;
      }

      Object.entries(row.cells).forEach(([cellRef, format]) => {
        const cell = worksheet.getCell(cellRef);

        // Set value or formula
        if (format.formula) {
          cell.value = { formula: format.formula };
        } else if (data && typeof format.value === 'string' && format.value.startsWith('{') && format.value.endsWith('}')) {
          // Template variable replacement
          const key = format.value.slice(1, -1);
          cell.value = data[key] ?? format.value;
        } else {
          cell.value = format.value;
        }

        // Apply font
        if (format.font) {
          cell.font = {
            bold: format.font.bold,
            italic: format.font.italic,
            size: format.font.size,
            color: format.font.color ? { argb: format.font.color } : undefined,
            name: format.font.name
          };
        }

        // Apply fill
        if (format.fill) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: format.fill.fgColor }
          };
        }

        // Apply alignment
        if (format.alignment) {
          cell.alignment = format.alignment;
        }

        // Apply border
        if (format.border) {
          cell.border = {};
          ['top', 'bottom', 'left', 'right'].forEach(side => {
            const b = (format.border as any)?.[side];
            if (b) {
              (cell.border as any)[side] = {
                style: b.style,
                color: { argb: b.color }
              };
            }
          });
        }

        // Apply number format
        if (format.numFmt) {
          cell.numFmt = format.numFmt;
        }
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

/**
 * Convert column number to letter (1 = A, 27 = AA)
 */
export function getColumnLetter(colNumber: number): string {
  let letter = '';
  while (colNumber > 0) {
    const mod = (colNumber - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letter;
}

/**
 * Convert column letter to number (A = 1, AA = 27)
 */
export function getColumnNumber(letter: string): number {
  let number = 0;
  for (let i = 0; i < letter.length; i++) {
    number = number * 26 + (letter.charCodeAt(i) - 64);
  }
  return number;
}

/**
 * Clone formatting from one cell to another
 */
export function cloneCellFormat(source: CellFormat): CellFormat {
  return JSON.parse(JSON.stringify(source));
}
