import React, { useState } from 'react';
import { Plus, Trash2, Settings2, AlignLeft, AlignCenter, AlignRight, DollarSign, Hash, Type, Bold, Italic, Underline, Link2, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CustomColumn, CustomRow, ColumnType, ColumnOptions, CurrencyFormat, TextAlign, FontSize, evaluateFormula, evaluateRowFormula, isRowLevelFormula, getConditionalStyle, ConditionalFormat, CustomTable } from '@/hooks/useCustomTables';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SpreadsheetGridProps {
  columns: CustomColumn[];
  rows: CustomRow[];
  allTables?: CustomTable[];
  allTableData?: { tableId: string; columns: CustomColumn[]; rows: CustomRow[] }[];
  onAddRow: () => void;
  onUpdateRow: (rowId: string, data: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
  onAddColumn: (name: string, type: ColumnType, options?: ColumnOptions) => void;
  onUpdateColumn: (columnId: string, updates: Partial<CustomColumn>) => void;
  onDeleteColumn: (columnId: string) => void;
}

const CURRENCY_SYMBOLS: Record<CurrencyFormat, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
  none: '',
};

const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
};

export function SpreadsheetGrid({
  columns,
  rows,
  allTables = [],
  allTableData = [],
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
}: SpreadsheetGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<ColumnType>('text');
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');
  
  // Column resizing state
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  const handleResizeStart = (e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnId);
    setResizeStartX(e.clientX);
    setResizeStartWidth(currentWidth);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - e.clientX;
      const newWidth = Math.max(60, currentWidth + delta);
      onUpdateColumn(columnId, { width: newWidth });
    };
    
    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleCellClick = (rowId: string, columnId: string, value: any) => {
    const column = columns.find(c => c.id === columnId);
    setSelectedColumn(columnId);
    if (column?.column_type === 'formula') return; // Don't allow editing formula cells
    setEditingCell({ rowId, columnId });
    setEditValue(value?.toString() || '');
    setFormulaBarValue(value?.toString() || '');
  };

  const handleCellBlur = (rowId: string, columnId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (row) {
      const column = columns.find(c => c.id === columnId);
      let parsedValue: any = editValue;
      
      if (column?.column_type === 'number' || column?.column_type === 'currency') {
        parsedValue = parseFloat(editValue) || 0;
      } else if (column?.column_type === 'checkbox') {
        parsedValue = editValue === 'true';
      }
      
      onUpdateRow(rowId, { ...row.data, [columnId]: parsedValue });
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowId: string, columnId: string) => {
    if (e.key === 'Enter') {
      handleCellBlur(rowId, columnId);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellBlur(rowId, columnId);
      // Move to next cell
      const colIndex = columns.findIndex(c => c.id === columnId);
      const rowIndex = rows.findIndex(r => r.id === rowId);
      if (colIndex < columns.length - 1) {
        const nextCol = columns[colIndex + 1];
        handleCellClick(rowId, nextCol.id, rows[rowIndex]?.data[nextCol.id]);
      } else if (rowIndex < rows.length - 1) {
        const nextRow = rows[rowIndex + 1];
        handleCellClick(nextRow.id, columns[0].id, nextRow.data[columns[0].id]);
      }
    }
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim(), newColumnType);
      setNewColumnName('');
      setNewColumnType('text');
      setShowNewColumn(false);
    }
  };

  const formatValue = (value: any, column: CustomColumn): string => {
    if (value === null || value === undefined) return '';
    
    const options = column.options || {};
    
    if (column.column_type === 'currency') {
      const currency = options.currency || 'ZAR';
      const decimals = options.decimals ?? 2;
      const num = parseFloat(value) || 0;
      const formatted = num.toFixed(decimals);
      return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
    }
    
    if (column.column_type === 'number') {
      const decimals = options.decimals ?? 0;
      const num = parseFloat(value) || 0;
      const formatted = decimals > 0 ? num.toFixed(decimals) : num.toString();
      return `${options.prefix || ''}${formatted}${options.suffix || ''}`;
    }
    
    if (column.column_type === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }
    
    return String(value);
  };

  const getAlignClass = (align?: TextAlign): string => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  const ColumnSettingsPopover = ({ column }: { column: CustomColumn }) => {
    const [localOptions, setLocalOptions] = useState<ColumnOptions>(column.options || {});
    const [localType, setLocalType] = useState<ColumnType>(column.column_type);
    
    const handleSave = () => {
      onUpdateColumn(column.id, { column_type: localType, options: localOptions });
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
            <Settings2 className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Column Type</Label>
              <Select value={localType} onValueChange={(v) => setLocalType(v as ColumnType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(localType === 'currency') && (
              <div>
                <Label className="text-xs">Currency</Label>
                <Select 
                  value={localOptions.currency || 'ZAR'} 
                  onValueChange={(v) => setLocalOptions({ ...localOptions, currency: v as CurrencyFormat })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZAR">R - South African Rand</SelectItem>
                    <SelectItem value="USD">$ - US Dollar</SelectItem>
                    <SelectItem value="EUR">€ - Euro</SelectItem>
                    <SelectItem value="GBP">£ - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(localType === 'number' || localType === 'currency') && (
              <div>
                <Label className="text-xs">Decimal Places</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={localOptions.decimals ?? 2}
                  onChange={(e) => setLocalOptions({ ...localOptions, decimals: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            )}

            {localType === 'formula' && (
              <div>
                <Label className="text-xs">Formula</Label>
                <Input
                  placeholder="e.g., =A+B, =A1+B1, SUM(A:A)"
                  value={localOptions.formula || ''}
                  onChange={(e) => {
                    const formula = e.target.value;
                    const isRowLevel = isRowLevelFormula(formula);
                    setLocalOptions({ ...localOptions, formula, isRowFormula: isRowLevel });
                  }}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Row-level: =A+B, =A*C/100<br />
                  Cell refs: =A1+B1, =A1*2<br />
                  Range: SUM(A1:A10), AVG(B1:B5)<br />
                  Column: SUM(A:A), COUNT(B:B)
                </p>
              </div>
            )}

            {localType === 'select' && (
              <div>
                <Label className="text-xs">Options (comma-separated)</Label>
                <Input
                  placeholder="Option 1, Option 2, Option 3"
                  value={(localOptions.choices || []).join(', ')}
                  onChange={(e) => setLocalOptions({ ...localOptions, choices: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Text Alignment</Label>
              <div className="flex gap-1 mt-1">
                <Button
                  variant={localOptions.textAlign === 'left' || !localOptions.textAlign ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalOptions({ ...localOptions, textAlign: 'left' })}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={localOptions.textAlign === 'center' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalOptions({ ...localOptions, textAlign: 'center' })}
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={localOptions.textAlign === 'right' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocalOptions({ ...localOptions, textAlign: 'right' })}
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Font Size</Label>
              <Select 
                value={localOptions.fontSize || 'sm'} 
                onValueChange={(v) => setLocalOptions({ ...localOptions, fontSize: v as FontSize })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">Extra Small</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="base">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Formatting */}
            <div>
              <Label className="text-xs">Conditional Formatting</Label>
              <div className="space-y-2 mt-1">
                {(localOptions.conditionalFormats || []).map((cf, idx) => (
                  <div key={idx} className="flex items-center gap-1 p-1 bg-muted/50 rounded text-xs">
                    <span className={cn('w-3 h-3 rounded', cf.color)} />
                    <span className="flex-1 truncate">
                      {cf.operator} {cf.value}{cf.value2 ? `-${cf.value2}` : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => {
                        const formats = [...(localOptions.conditionalFormats || [])];
                        formats.splice(idx, 1);
                        setLocalOptions({ ...localOptions, conditionalFormats: formats });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const formats = [...(localOptions.conditionalFormats || [])];
                      formats.push({ type: 'threshold', operator: 'lt', value: 0, color: 'bg-red-100', textColor: 'text-red-700' });
                      setLocalOptions({ ...localOptions, conditionalFormats: formats });
                    }}
                  >
                    <span className="w-2 h-2 rounded bg-red-500 mr-1" /> Negative
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const formats = [...(localOptions.conditionalFormats || [])];
                      formats.push({ type: 'threshold', operator: 'gt', value: 0, color: 'bg-green-100', textColor: 'text-green-700' });
                      setLocalOptions({ ...localOptions, conditionalFormats: formats });
                    }}
                  >
                    <span className="w-2 h-2 rounded bg-green-500 mr-1" /> Positive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const formats = [...(localOptions.conditionalFormats || [])];
                      formats.push({ type: 'threshold', operator: 'eq', value: 0, color: 'bg-yellow-100', textColor: 'text-yellow-700' });
                      setLocalOptions({ ...localOptions, conditionalFormats: formats });
                    }}
                  >
                    <span className="w-2 h-2 rounded bg-yellow-500 mr-1" /> Zero
                  </Button>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleSave}>
              Apply Settings
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const getColumnIcon = (column: CustomColumn) => {
    const options = column.options || {};
    if (options.isFormula || options.formula) return <span className="text-xs text-muted-foreground">fx</span>;
    switch (column.column_type) {
      case 'number': return <Hash className="h-3 w-3 text-muted-foreground" />;
      case 'currency': return <DollarSign className="h-3 w-3 text-muted-foreground" />;
      default: return <Type className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const isFormulaColumn = (column: CustomColumn): boolean => {
    const options = column.options || {};
    return !!(options.isFormula || options.formula);
  };

  const renderCell = (row: CustomRow, column: CustomColumn, rowIndex: number) => {
    const value = row.data[column.id];
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
    const options = column.options || {};
    const fontClass = FONT_SIZE_CLASSES[options.fontSize || 'sm'];
    const alignClass = getAlignClass(options.textAlign);

    // Formula column - calculate value
    if (isFormulaColumn(column) && options.formula) {
      let calculatedValue: number;
      
      // Check if it's a row-level formula (e.g., =A+B) or global formula
      if (options.isRowFormula || isRowLevelFormula(options.formula)) {
        calculatedValue = evaluateRowFormula(options.formula, row, columns);
      } else {
        calculatedValue = evaluateFormula(options.formula, rows, columns, allTables, allTableData);
      }
      
      // Apply conditional formatting
      const condStyle = getConditionalStyle(calculatedValue, options.conditionalFormats);
      
      return (
        <div className={cn(
          'px-3 py-2 h-full bg-muted/30 font-medium', 
          fontClass, 
          alignClass,
          condStyle?.bg,
          condStyle?.text
        )}>
          {formatValue(calculatedValue, { ...column, column_type: 'number' })}
        </div>
      );
    }

    // Apply conditional formatting for regular cells
    const condStyle = getConditionalStyle(value, options.conditionalFormats);

    if (column.column_type === 'checkbox') {
      return (
        <div className="flex items-center justify-center h-full">
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => {
              onUpdateRow(row.id, { ...row.data, [column.id]: checked });
            }}
          />
        </div>
      );
    }

    if (column.column_type === 'select' && options.choices) {
      return (
        <Select
          value={value || ''}
          onValueChange={(newValue) => {
            onUpdateRow(row.id, { ...row.data, [column.id]: newValue });
          }}
        >
          <SelectTrigger className={cn('h-full border-0 rounded-none focus:ring-0', fontClass)}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.choices.map((choice) => (
              <SelectItem key={choice} value={choice}>
                {choice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (isEditing) {
      // Use textarea for multi-line editing like Excel
      if (column.column_type === 'text') {
        return (
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellBlur(row.id, column.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCellBlur(row.id, column.id);
              } else if (e.key === 'Escape') {
                setEditingCell(null);
              } else if (e.key === 'Tab') {
                e.preventDefault();
                handleCellBlur(row.id, column.id);
                // Move to next cell
                const colIndex = columns.findIndex(c => c.id === column.id);
                const rowIdx = rows.findIndex(r => r.id === row.id);
                if (colIndex < columns.length - 1) {
                  const nextCol = columns[colIndex + 1];
                  handleCellClick(row.id, nextCol.id, rows[rowIdx]?.data[nextCol.id]);
                } else if (rowIdx < rows.length - 1) {
                  const nextRow = rows[rowIdx + 1];
                  handleCellClick(nextRow.id, columns[0].id, nextRow.data[columns[0].id]);
                }
              }
            }}
            className={cn(
              'w-full h-full min-h-[40px] px-3 py-2 border-0 rounded-none resize-none',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
              'bg-background',
              fontClass
            )}
            style={{ lineHeight: '1.4' }}
          />
        );
      }
      
      return (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellBlur(row.id, column.id)}
          onKeyDown={(e) => handleKeyDown(e, row.id, column.id)}
          className={cn('h-full border-0 rounded-none focus-visible:ring-2 focus-visible:ring-primary', fontClass)}
          type={column.column_type === 'number' || column.column_type === 'currency' ? 'number' : column.column_type === 'date' ? 'date' : 'text'}
        />
      );
    }

    return (
      <div
        className={cn(
          'px-3 py-2 h-full cursor-text truncate', 
          fontClass, 
          alignClass,
          condStyle?.bg,
          condStyle?.text
        )}
        onClick={() => handleCellClick(row.id, column.id, value)}
      >
        {formatValue(value, column) || <span className="text-muted-foreground">-</span>}
      </div>
    );
  };

  // Calculate formula totals for footer
  const getColumnTotal = (column: CustomColumn): string | null => {
    if (column.column_type !== 'number' && column.column_type !== 'currency') return null;
    const sum = rows.reduce((acc, row) => acc + (parseFloat(row.data[column.id]) || 0), 0);
    return formatValue(sum, column);
  };

  const selectedCol = columns.find(c => c.id === selectedColumn);

  return (
    <div className="flex flex-col">
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30 flex-wrap">
        {/* Font Size */}
        <Select
          value={selectedCol?.options?.fontSize || 'sm'}
          onValueChange={(v) => {
            if (selectedColumn) {
              const col = columns.find(c => c.id === selectedColumn);
              if (col) {
                onUpdateColumn(selectedColumn, { options: { ...col.options, fontSize: v as FontSize } });
              }
            }
          }}
        >
          <SelectTrigger className="h-8 w-24">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="xs">XS</SelectItem>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="base">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text Alignment */}
        <div className="flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedCol?.options?.textAlign === 'left' || !selectedCol?.options?.textAlign ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (selectedColumn) {
                    const col = columns.find(c => c.id === selectedColumn);
                    if (col) onUpdateColumn(selectedColumn, { options: { ...col.options, textAlign: 'left' } });
                  }
                }}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Left</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedCol?.options?.textAlign === 'center' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (selectedColumn) {
                    const col = columns.find(c => c.id === selectedColumn);
                    if (col) onUpdateColumn(selectedColumn, { options: { ...col.options, textAlign: 'center' } });
                  }
                }}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Center</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedCol?.options?.textAlign === 'right' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (selectedColumn) {
                    const col = columns.find(c => c.id === selectedColumn);
                    if (col) onUpdateColumn(selectedColumn, { options: { ...col.options, textAlign: 'right' } });
                  }
                }}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align Right</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Currency */}
        <Select
          value={selectedCol?.options?.currency || 'none'}
          onValueChange={(v) => {
            if (selectedColumn) {
              const col = columns.find(c => c.id === selectedColumn);
              if (col) {
                onUpdateColumn(selectedColumn, { 
                  column_type: v !== 'none' ? 'currency' : col.column_type,
                  options: { ...col.options, currency: v as CurrencyFormat } 
                });
              }
            }
          }}
        >
          <SelectTrigger className="h-8 w-20">
            <SelectValue placeholder="$" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="ZAR">R</SelectItem>
            <SelectItem value="USD">$</SelectItem>
            <SelectItem value="EUR">€</SelectItem>
            <SelectItem value="GBP">£</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Column Type Quick Select */}
        <Select
          value={selectedCol?.column_type || 'text'}
          onValueChange={(v) => {
            if (selectedColumn) {
              onUpdateColumn(selectedColumn, { column_type: v as ColumnType });
            }
          }}
        >
          <SelectTrigger className="h-8 w-28">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="currency">Currency</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="checkbox">Checkbox</SelectItem>
            <SelectItem value="formula">Formula</SelectItem>
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Formula reference hint */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
          <Link2 className="h-3 w-3" />
          <span>=A1+B1 | SUM(A1:A10) | =Table.A1</span>
        </div>

        <div className="flex-1" />

        {/* Formula Bar */}
        {editingCell && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">fx</span>
            <Input
              value={formulaBarValue}
              onChange={(e) => {
                setFormulaBarValue(e.target.value);
                setEditValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingCell) {
                  handleCellBlur(editingCell.rowId, editingCell.columnId);
                }
              }}
              className="h-8 w-64 font-mono text-sm"
              placeholder="Enter value or formula..."
            />
          </div>
        )}
      </div>

      {/* Table with Excel-like scrolling */}
      <div className="relative flex-1 overflow-hidden border rounded-md">
        {/* Scrollable container - Excel-like horizontal and vertical scrolling */}
        <div 
          className="overflow-auto h-full max-h-[calc(100vh-280px)]"
          style={{
            scrollBehavior: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          <table className="border-collapse w-max table-fixed" style={{ minWidth: '100%' }}>
            <thead className="sticky top-0 z-20 bg-background">
              <tr className="bg-muted/50">
                <th className="w-10 min-w-[40px] border-b border-r p-0 sticky left-0 bg-muted/50 z-30" />
            {columns.map((column) => (
              <th
                key={column.id}
                className="border-b border-r text-left font-medium text-sm relative group/header"
                style={{ width: column.width, minWidth: column.width }}
              >
                <div className="flex items-center px-3 py-2 group gap-2">
                  {getColumnIcon(column)}
                  <span className="flex-1 truncate">{column.name}</span>
                  <ColumnSettingsPopover column={column} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => onDeleteColumn(column.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                {/* Resize handle */}
                <div
                  className={cn(
                    "absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors",
                    resizingColumn === column.id && "bg-primary"
                  )}
                  onMouseDown={(e) => handleResizeStart(e, column.id, column.width)}
                />
              </th>
            ))}
            <th className="border-b w-40 p-0">
              {showNewColumn ? (
                <div className="flex flex-col gap-1 p-1">
                  <Input
                    autoFocus
                    placeholder="Column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') setShowNewColumn(false);
                    }}
                    className="h-7 text-sm"
                  />
                  <Select value={newColumnType} onValueChange={(v) => setNewColumnType(v as ColumnType)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="currency">Currency</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7" onClick={handleAddColumn}>Add</Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-full justify-start text-muted-foreground"
                  onClick={() => setShowNewColumn(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Column
                </Button>
              )}
            </th>
          </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="group hover:bg-muted/30">
                  <td className="border-b border-r text-center text-xs text-muted-foreground p-0 sticky left-0 bg-background z-10 min-w-[40px]">
                <div className="flex items-center justify-center h-10">
                  <span className="group-hover:hidden">{index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hidden group-hover:flex"
                    onClick={() => onDeleteRow(row.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </td>
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    'border-b border-r p-0 h-10',
                    editingCell?.rowId === row.id && editingCell?.columnId === column.id && 'ring-2 ring-primary ring-inset'
                  )}
                >
                  {renderCell(row, column, index)}
                </td>
              ))}
              <td className="border-b" />
            </tr>
          ))}
        </tbody>
        {/* Totals row */}
        {rows.length > 0 && columns.some(c => c.column_type === 'number' || c.column_type === 'currency') && (
          <tfoot>
            <tr className="bg-muted/30 font-medium">
              <td className="border-t border-r p-2 text-center text-xs text-muted-foreground">Σ</td>
              {columns.map((column) => (
                <td key={column.id} className="border-t border-r p-2 text-sm">
                  <div className={getAlignClass(column.options?.textAlign)}>
                    {getColumnTotal(column) || ''}
                  </div>
                </td>
              ))}
              <td className="border-t" />
            </tr>
          </tfoot>
        )}
          </table>
        </div>
        
        {/* Add Row button - sticky at bottom */}
        <div className="sticky bottom-0 bg-background border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={onAddRow}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        </div>
      </div>
    </div>
  );
}
