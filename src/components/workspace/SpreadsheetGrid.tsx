import React, { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
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
import { CustomColumn, CustomRow, ColumnType } from '@/hooks/useCustomTables';

interface SpreadsheetGridProps {
  columns: CustomColumn[];
  rows: CustomRow[];
  onAddRow: () => void;
  onUpdateRow: (rowId: string, data: Record<string, any>) => void;
  onDeleteRow: (rowId: string) => void;
  onAddColumn: (name: string, type: ColumnType) => void;
  onUpdateColumn: (columnId: string, updates: Partial<CustomColumn>) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function SpreadsheetGrid({
  columns,
  rows,
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
  const [showNewColumn, setShowNewColumn] = useState(false);

  const handleCellClick = (rowId: string, columnId: string, value: any) => {
    setEditingCell({ rowId, columnId });
    setEditValue(value?.toString() || '');
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
    }
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim(), 'text');
      setNewColumnName('');
      setShowNewColumn(false);
    }
  };

  const renderCell = (row: CustomRow, column: CustomColumn) => {
    const value = row.data[column.id];
    const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;

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

    if (column.column_type === 'select' && column.options?.choices) {
      return (
        <Select
          value={value || ''}
          onValueChange={(newValue) => {
            onUpdateRow(row.id, { ...row.data, [column.id]: newValue });
          }}
        >
          <SelectTrigger className="h-full border-0 rounded-none focus:ring-0">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {(column.options.choices as string[]).map((choice) => (
              <SelectItem key={choice} value={choice}>
                {choice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (isEditing) {
      return (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellBlur(row.id, column.id)}
          onKeyDown={(e) => handleKeyDown(e, row.id, column.id)}
          className="h-full border-0 rounded-none focus-visible:ring-2 focus-visible:ring-primary"
          type={column.column_type === 'number' || column.column_type === 'currency' ? 'number' : 'text'}
        />
      );
    }

    let displayValue = value;
    if (column.column_type === 'currency' && value) {
      displayValue = new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
      }).format(value);
    } else if (column.column_type === 'date' && value) {
      displayValue = new Date(value).toLocaleDateString();
    }

    return (
      <div
        className="px-3 py-2 h-full cursor-text truncate"
        onClick={() => handleCellClick(row.id, column.id, value)}
      >
        {displayValue || <span className="text-muted-foreground">-</span>}
      </div>
    );
  };

  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="w-10 border-b border-r p-0" />
            {columns.map((column) => (
              <th
                key={column.id}
                className="border-b border-r text-left font-medium text-sm"
                style={{ width: column.width, minWidth: column.width }}
              >
                <div className="flex items-center px-3 py-2 group">
                  <span className="flex-1 truncate">{column.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => onDeleteColumn(column.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </th>
            ))}
            <th className="border-b w-32 p-0">
              {showNewColumn ? (
                <div className="flex items-center p-1">
                  <Input
                    autoFocus
                    placeholder="Column name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onBlur={() => {
                      if (!newColumnName.trim()) setShowNewColumn(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') setShowNewColumn(false);
                    }}
                    className="h-7 text-sm"
                  />
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
              <td className="border-b border-r text-center text-xs text-muted-foreground p-0">
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
                  {renderCell(row, column)}
                </td>
              ))}
              <td className="border-b" />
            </tr>
          ))}
        </tbody>
      </table>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start mt-1 text-muted-foreground"
        onClick={onAddRow}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Row
      </Button>
    </div>
  );
}
