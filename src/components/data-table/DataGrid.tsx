import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  EyeOff,
  Columns,
  Download,
  Upload,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Search,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGridStore } from '@/stores/grid-store';
import { exportExcel, exportCSV, downloadBlob } from '@/lib/excel-utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DataGridProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  onRowClick?: (row: TData) => void;
  onRowDoubleClick?: (row: TData) => void;
  onCellEdit?: (rowId: string, columnId: string, value: any) => void;
  onAddRow?: () => void;
  onDeleteRows?: (rowIds: string[]) => void;
  enableSelection?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnHiding?: boolean;
  enableExport?: boolean;
  enableZoom?: boolean;
  enableUndoRedo?: boolean;
  pageSize?: number;
  getRowId?: (row: TData) => string;
  title?: string;
  emptyMessage?: string;
}

export function DataGrid<TData>({
  data,
  columns,
  onRowClick,
  onRowDoubleClick,
  onCellEdit,
  onAddRow,
  onDeleteRows,
  enableSelection = true,
  enablePagination = true,
  enableSorting = true,
  enableFiltering = true,
  enableColumnHiding = true,
  enableExport = true,
  enableZoom = true,
  enableUndoRedo = true,
  pageSize = 20,
  getRowId = (row: any) => row.id,
  title,
  emptyMessage = 'No data available',
}: DataGridProps<TData>) {
  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Store
  const { zoom, zoomIn, zoomOut, resetZoom, pushChange, undo, redo, canUndo, canRedo } = useGridStore();

  // Selection column
  const selectionColumn: ColumnDef<TData> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    size: 40,
    enableSorting: false,
    enableHiding: false,
  };

  // Combine columns
  const allColumns = useMemo(() => {
    const cols: ColumnDef<TData, any>[] = [];
    if (enableSelection) cols.push(selectionColumn);
    cols.push(...columns);
    return cols;
  }, [columns, enableSelection]);

  // Table instance
  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getRowId,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize },
    },
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && enableUndoRedo) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y' && enableUndoRedo) {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'a' && enableSelection) {
          e.preventDefault();
          table.toggleAllRowsSelected(true);
        }
      }
      if (e.key === 'Escape' && editingCell) {
        setEditingCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingCell, enableUndoRedo, enableSelection]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    const change = undo();
    if (change && onCellEdit) {
      onCellEdit(change.rowId, change.columnId, change.previousValue);
    }
  }, [undo, onCellEdit]);

  const handleRedo = useCallback(() => {
    const change = redo();
    if (change && onCellEdit) {
      onCellEdit(change.rowId, change.columnId, change.newValue);
    }
  }, [redo, onCellEdit]);

  // Cell editing
  const handleCellDoubleClick = (rowId: string, columnId: string, currentValue: any) => {
    setEditingCell({ rowId, columnId });
    setEditValue(String(currentValue ?? ''));
  };

  const handleCellSave = () => {
    if (editingCell && onCellEdit) {
      const row = data.find(r => getRowId(r) === editingCell.rowId);
      const previousValue = row ? (row as any)[editingCell.columnId] : undefined;
      
      // Push to undo stack
      pushChange({
        rowId: editingCell.rowId,
        columnId: editingCell.columnId,
        previousValue,
        newValue: editValue,
        timestamp: Date.now(),
      });
      
      onCellEdit(editingCell.rowId, editingCell.columnId, editValue);
    }
    setEditingCell(null);
  };

  // Export handlers
  const handleExportExcel = async () => {
    const exportData = table.getFilteredRowModel().rows.map(row => row.original as Record<string, any>);
    const blob = await exportExcel(exportData, {
      filename: `${title || 'export'}.xlsx`,
      sheetName: title || 'Data',
    });
    downloadBlob(blob, `${title || 'export'}.xlsx`);
  };

  const handleExportCSV = () => {
    const exportData = table.getFilteredRowModel().rows.map(row => row.original as Record<string, any>);
    const blob = exportCSV(exportData, `${title || 'export'}.csv`);
    downloadBlob(blob, `${title || 'export'}.csv`);
  };

  // Delete selected
  const handleDeleteSelected = () => {
    const selectedIds = Object.keys(rowSelection).filter(id => rowSelection[id]);
    if (selectedIds.length > 0 && onDeleteRows) {
      onDeleteRows(selectedIds);
      setRowSelection({});
    }
  };

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  // Zoom styles
  const zoomStyles = {
    fontSize: `${14 * (zoom / 100)}px`,
    '--row-height': `${40 * (zoom / 100)}px`,
  } as React.CSSProperties;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {title && <h2 className="text-lg font-semibold mr-4">{title}</h2>}
        
        {/* Search */}
        {enableFiltering && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all columns..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Selection info */}
        {selectedCount > 0 && (
          <Badge variant="secondary" className="mr-2">
            {selectedCount} selected
          </Badge>
        )}

        {/* Undo/Redo */}
        {enableUndoRedo && (
          <div className="flex items-center border rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={handleUndo}
                  disabled={!canUndo()}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={handleRedo}
                  disabled={!canRedo()}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Zoom */}
        {enableZoom && (
          <div className="flex items-center border rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={zoomOut}
                  disabled={zoom <= 50}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom out</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 rounded-none min-w-[50px]"
              onClick={resetZoom}
            >
              {zoom}%
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={zoomIn}
                  disabled={zoom >= 200}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom in</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Column visibility */}
        {enableColumnHiding && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Columns className="h-4 w-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table.getAllColumns()
                .filter(col => col.getCanHide())
                .map(column => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Export */}
        {enableExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                Export to Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Delete selected */}
        {selectedCount > 0 && onDeleteRows && (
          <Button
            variant="destructive"
            size="sm"
            className="h-9"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedCount})
          </Button>
        )}

        {/* Add row */}
        {onAddRow && (
          <Button size="sm" className="h-9" onClick={onAddRow}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <ScrollArea className="w-full">
          <div style={zoomStyles}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="whitespace-nowrap bg-muted/50 font-semibold"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              'flex items-center gap-2',
                              header.column.getCanSort() && 'cursor-pointer select-none'
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() && (
                              header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : (
                                <ArrowDown className="h-4 w-4" />
                              )
                            )}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={allColumns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        row.getIsSelected() && 'bg-primary/10'
                      )}
                      onClick={() => onRowClick?.(row.original)}
                      onDoubleClick={() => onRowDoubleClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isEditing =
                          editingCell?.rowId === row.id &&
                          editingCell?.columnId === cell.column.id;

                        return (
                          <TableCell
                            key={cell.id}
                            className="py-2"
                            style={{ 
                              height: 'var(--row-height)',
                              width: cell.column.getSize(),
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (onCellEdit && cell.column.id !== 'select') {
                                handleCellDoubleClick(
                                  row.id,
                                  cell.column.id,
                                  cell.getValue()
                                );
                              }
                            }}
                          >
                            {isEditing ? (
                              <Input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellSave();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="h-8"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              flexRender(cell.column.columnDef.cell, cell.getContext())
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} row(s) total
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
