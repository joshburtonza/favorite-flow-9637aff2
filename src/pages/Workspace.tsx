import React, { useState } from 'react';
import { Plus, Table2, MoreVertical, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCustomTables, useTableColumns, useTableRows, ColumnType } from '@/hooks/useCustomTables';
import { SpreadsheetGrid } from '@/components/workspace/SpreadsheetGrid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function Workspace() {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [newTableDialog, setNewTableDialog] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; tableId?: string; name?: string }>({ open: false });

  const { tables, isLoading: tablesLoading, createTable, deleteTable, updateTable } = useCustomTables();
  const { columns, addColumn, updateColumn, deleteColumn } = useTableColumns(selectedTableId);
  const { rows, addRow, updateRow, deleteRow } = useTableRows(selectedTableId);

  const selectedTable = tables.find(t => t.id === selectedTableId);

  const handleCreateTable = () => {
    if (newTableName.trim()) {
      createTable.mutate({ name: newTableName.trim() }, {
        onSuccess: (data) => {
          setSelectedTableId(data.id);
          setNewTableName('');
          setNewTableDialog(false);
        },
      });
    }
  };

  const handleRenameTable = () => {
    if (renameDialog.tableId && renameDialog.name?.trim()) {
      updateTable.mutate({ id: renameDialog.tableId, name: renameDialog.name.trim() });
      setRenameDialog({ open: false });
    }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Table List */}
        <div className="w-64 border-r bg-card/50 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Tables</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setNewTableDialog(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {tables.map((table) => (
                <div
                  key={table.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer group',
                    selectedTableId === table.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                  onClick={() => setSelectedTableId(table.id)}
                >
                  <Table2 className="h-4 w-4" />
                  <span className="flex-1 truncate text-sm">{table.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameDialog({ open: true, tableId: table.id, name: table.name });
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      {!table.is_system && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedTableId === table.id) setSelectedTableId(null);
                            deleteTable.mutate(table.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {tables.length === 0 && !tablesLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tables yet</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setNewTableDialog(true)}
                  >
                    Create your first table
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedTable ? (
            <>
              {/* Table Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  <h1 className="text-xl font-semibold">{selectedTable.name}</h1>
                </div>
                {selectedTable.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedTable.description}</p>
                )}
              </div>

              {/* Spreadsheet Grid */}
              <ScrollArea className="flex-1 p-4">
                <SpreadsheetGrid
                  columns={columns}
                  rows={rows}
                  onAddRow={() => addRow.mutate({})}
                  onUpdateRow={(rowId, data) => updateRow.mutate({ id: rowId, data })}
                  onDeleteRow={(rowId) => deleteRow.mutate(rowId)}
                  onAddColumn={(name, type) => addColumn.mutate({ table_id: selectedTableId!, name, column_type: type })}
                  onUpdateColumn={(columnId, updates) => updateColumn.mutate({ id: columnId, ...updates })}
                  onDeleteColumn={(columnId) => deleteColumn.mutate(columnId)}
                />
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h2 className="text-lg font-medium mb-2">Select a table</h2>
                <p className="text-sm">Choose a table from the sidebar or create a new one</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setNewTableDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Table
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Table Dialog */}
      <Dialog open={newTableDialog} onOpenChange={setNewTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Table name"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTable()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTable} disabled={createTable.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Table Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Table</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Table name"
            value={renameDialog.name || ''}
            onChange={(e) => setRenameDialog({ ...renameDialog, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameTable()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleRenameTable}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
