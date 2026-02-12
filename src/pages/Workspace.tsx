import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Table2, MoreVertical, Pencil, Trash2, FileSpreadsheet, Download, Upload, FolderOpen, ChevronRight, ChevronDown, Save, Folder, FileText, ArrowLeft, FolderPlus, FileUp, Loader2, Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ExcelJS from 'exceljs';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useCustomTables, useTableColumns, useTableRows, ColumnType, ColumnOptions, exportTableToCSV, parseCSV, generateCSVContent } from '@/hooks/useCustomTables';
import { SpreadsheetGrid } from '@/components/workspace/SpreadsheetGrid';
import { WorkspaceAIPanel, WorkspaceAction } from '@/components/workspace/WorkspaceAIPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDocumentFolders } from '@/hooks/useDocumentFolders';
import { supabase } from '@/integrations/supabase/client';
import { usePDFExtraction } from '@/hooks/usePDFExtraction';

export default function Workspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newTableFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [newTableDialog, setNewTableDialog] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableDescription, setNewTableDescription] = useState('');
  const [newTableGroup, setNewTableGroup] = useState('');
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; tableId?: string; name?: string; description?: string; group?: string }>({ open: false });
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [saveToFolderDialog, setSaveToFolderDialog] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [saveFileName, setSaveFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [importFromFolderDialog, setImportFromFolderDialog] = useState(false);
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null);
  const [folderDocuments, setFolderDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [selectedDocForImport, setSelectedDocForImport] = useState<any | null>(null);
  const [importFromFolderData, setImportFromFolderData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [expandedSaveFolders, setExpandedSaveFolders] = useState<Set<string>>(new Set());
  // New table from CSV import (batch support)
  const [importAsNewTableDialog, setImportAsNewTableDialog] = useState(false);
  const [batchImportData, setBatchImportData] = useState<{ 
    headers: string[]; 
    rows: string[][]; 
    fileName: string; 
    confidence?: string; 
    documentType?: string; 
    summary?: string;
    cellStyles?: Record<string, Record<string, any>>;
    headerRowIndex?: number;
  }[]>([]);
  const [isCreatingTableFromImport, setIsCreatingTableFromImport] = useState(false);
  
  // PDF import
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const { extractMultipleFiles, isExtracting } = usePDFExtraction();
  
  // AI Panel state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelExpanded, setAIPanelExpanded] = useState(false);

  const { folders, folderTree, createFolder } = useDocumentFolders();

  const toggleSaveFolder = (folderId: string) => {
    setExpandedSaveFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const { tables, isLoading: tablesLoading, createTable, deleteTable, updateTable } = useCustomTables();
  const { columns, addColumn, updateColumn, deleteColumn } = useTableColumns(selectedTableId);
  const { rows, addRow, updateRow, deleteRow } = useTableRows(selectedTableId);

  // Load all table data for cross-table references
  const [allTableData, setAllTableData] = useState<{ tableId: string; columns: any[]; rows: any[] }[]>([]);
  
  useEffect(() => {
    const loadAllTableData = async () => {
      const data: { tableId: string; columns: any[]; rows: any[] }[] = [];
      for (const table of tables) {
        const { data: cols } = await supabase
          .from('custom_columns')
          .select('*')
          .eq('table_id', table.id)
          .order('order_position');
        const { data: tableRows } = await supabase
          .from('custom_rows')
          .select('*')
          .eq('table_id', table.id);
        if (cols && tableRows) {
          data.push({ tableId: table.id, columns: cols, rows: tableRows });
        }
      }
      setAllTableData(data);
    };
    if (tables.length > 0) {
      loadAllTableData();
    }
  }, [tables]);

  const selectedTable = tables.find(t => t.id === selectedTableId);

  // Group tables by group_name
  const groupedTables = tables.reduce((acc, table) => {
    const group = (table as any).group_name || 'Ungrouped';
    if (!acc[group]) acc[group] = [];
    acc[group].push(table);
    return acc;
  }, {} as Record<string, typeof tables>);

  const handleCreateTable = () => {
    if (newTableName.trim()) {
      createTable.mutate({ 
        name: newTableName.trim(), 
        description: newTableDescription.trim() || undefined,
      }, {
        onSuccess: (data) => {
          setSelectedTableId(data.id);
          setNewTableName('');
          setNewTableDescription('');
          setNewTableGroup('');
          setNewTableDialog(false);
        },
      });
    }
  };

  const handleRenameTable = () => {
    if (renameDialog.tableId && renameDialog.name?.trim()) {
      updateTable.mutate({ 
        id: renameDialog.tableId, 
        name: renameDialog.name.trim(),
        description: renameDialog.description?.trim(),
      });
      setRenameDialog({ open: false });
    }
  };

  const handleExport = () => {
    if (selectedTable && columns.length > 0) {
      exportTableToCSV(columns, rows, selectedTable.name);
      toast({ title: 'Table exported', description: `${selectedTable.name}.csv downloaded` });
    }
  };

  const handleSaveToFolderOpen = () => {
    if (selectedTable) {
      setSaveFileName(`${selectedTable.name.replace(/\s+/g, '_')}.csv`);
      setSaveToFolderDialog(true);
    }
  };

  const handleSaveToFolder = async () => {
    if (!selectedTable || !saveFileName.trim() || columns.length === 0) return;
    
    setIsSaving(true);
    try {
      const csvContent = generateCSVContent(columns, rows);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const fileName = saveFileName.endsWith('.csv') ? saveFileName : `${saveFileName}.csv`;
      const filePath = `tables/${selectedTable.id}/${Date.now()}_${fileName}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, { contentType: 'text/csv' });
      
      if (uploadError) throw uploadError;
      
      // Create document record
      const { error: docError } = await supabase
        .from('uploaded_documents')
        .insert({
          file_name: fileName,
          file_path: filePath,
          file_type: 'text/csv',
          file_size: blob.size,
          folder_id: selectedFolderId,
          document_type: 'spreadsheet_export',
          status: 'finalized',
        });
      
      if (docError) throw docError;
      
      toast({ title: 'Table saved to folder', description: `${fileName} saved successfully` });
      setSaveToFolderDialog(false);
      setSelectedFolderId(null);
    } catch (error: any) {
      toast({ title: 'Error saving table', description: error.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setImportData(parsed);
      setImportDialog(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!selectedTableId || !importData) return;

    // Create columns if they don't exist
    for (const header of importData.headers) {
      const existingCol = columns.find(c => c.name.toLowerCase() === header.toLowerCase());
      if (!existingCol) {
        await addColumn.mutateAsync({ table_id: selectedTableId, name: header, column_type: 'text' });
      }
    }

    // Wait a bit for columns to be created
    await new Promise(resolve => setTimeout(resolve, 500));

    // Add rows
    for (const rowData of importData.rows) {
      const data: Record<string, any> = {};
      importData.headers.forEach((header, i) => {
        const col = columns.find(c => c.name.toLowerCase() === header.toLowerCase());
        if (col) {
          data[col.id] = rowData[i];
        }
      });
      await addRow.mutateAsync(data);
    }

    toast({ 
      title: 'Import complete', 
      description: `${importData.rows.length} rows imported` 
    });
    setImportDialog(false);
    setImportData(null);
  };

  // Handle importing CSV as new table(s) - supports batch upload
  const handleNewTableFileClick = () => {
    newTableFileInputRef.current?.click();
  };

  const handleNewTableFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const parsedFiles: { 
      headers: string[]; 
      rows: string[][]; 
      fileName: string;
      cellStyles?: Record<string, Record<string, any>>;
    }[] = [];
    
    for (const file of Array.from(files)) {
      const fileName = file.name.replace(/\.(csv|xlsx?|tsv)$/i, '');
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      
      let parsed: { headers: string[]; rows: string[][]; cellStyles?: Record<string, Record<string, any>>; headerRowIndex?: number };
      
      if (isExcel) {
        try {
          const buffer = await file.arrayBuffer();
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          const sheet = workbook.worksheets[0];
          if (!sheet || sheet.rowCount === 0) {
            parsed = { headers: [], rows: [] };
          } else {
            // Find header row (first row with 2+ non-empty cells)
            let headerRowIndex = 1;
            for (let i = 1; i <= Math.min(10, sheet.rowCount); i++) {
              const row = sheet.getRow(i);
              let nonEmpty = 0;
              row.eachCell({ includeEmpty: false }, () => { nonEmpty++; });
              if (nonEmpty >= 2) {
                headerRowIndex = i;
                break;
              }
            }
            
            const headerRow = sheet.getRow(headerRowIndex);
            const colCount = headerRow.cellCount || headerRow.actualCellCount || 6;
            
            // Extract headers
            const headers: string[] = [];
            for (let c = 1; c <= colCount; c++) {
              const cell = headerRow.getCell(c);
              const val = cell.value;
              const text = val !== null && val !== undefined ? String(val).trim() : '';
              headers.push(text || `Column ${c}`);
            }
            
            // Extract cell styles for ALL cells
            const cellStyles: Record<string, Record<string, any>> = {};
            
            sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
              row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                const style: Record<string, any> = {};
                let hasStyle = false;
                
                if (cell.font) {
                  if (cell.font.bold) { style.bold = true; hasStyle = true; }
                  if (cell.font.italic) { style.italic = true; hasStyle = true; }
                  if (cell.font.size) { style.fontSize = cell.font.size; hasStyle = true; }
                  if (cell.font.color?.argb) { 
                    style.fontColor = cell.font.color.argb.substring(2); 
                    hasStyle = true; 
                  }
                }
                
                if (cell.fill && cell.fill.type === 'pattern') {
                  const patternFill = cell.fill as ExcelJS.FillPattern;
                  if (patternFill.fgColor?.argb) {
                    const color = patternFill.fgColor.argb.substring(2);
                    if (color !== 'FFFFFF' && color !== '000000') {
                      style.bgColor = color;
                      hasStyle = true;
                    }
                  }
                }
                
                if (cell.alignment?.horizontal) {
                  style.alignment = cell.alignment.horizontal;
                  hasStyle = true;
                }
                
                if (cell.numFmt) {
                  style.numFmt = cell.numFmt;
                  hasStyle = true;
                }
                
                if (hasStyle) {
                  const colLetter = colNumber < 27 
                    ? String.fromCharCode(64 + colNumber) 
                    : String.fromCharCode(64 + Math.floor((colNumber - 1) / 26)) + String.fromCharCode(65 + ((colNumber - 1) % 26));
                  cellStyles[`${colLetter}${rowNumber}`] = style;
                }
              });
            });
            
            // Extract data rows
            const rows: string[][] = [];
            for (let r = headerRowIndex + 1; r <= sheet.rowCount; r++) {
              const row = sheet.getRow(r);
              const rowData: string[] = [];
              let hasData = false;
              
              for (let c = 1; c <= colCount; c++) {
                const cell = row.getCell(c);
                let val = '';
                
                if (cell.value !== null && cell.value !== undefined) {
                  if (typeof cell.value === 'object' && 'richText' in (cell.value as any)) {
                    val = (cell.value as any).richText.map((rt: any) => rt.text).join('');
                  } else if (typeof cell.value === 'number') {
                    val = cell.value.toLocaleString('en-ZA', { 
                      minimumFractionDigits: 0, 
                      maximumFractionDigits: 2 
                    });
                  } else if (cell.value instanceof Date) {
                    val = cell.value.toLocaleDateString('en-ZA');
                  } else {
                    val = String(cell.value).trim();
                  }
                  if (val) hasData = true;
                }
                
                rowData.push(val);
              }
              
              if (hasData) {
                rows.push(rowData);
              }
            }
            
            parsed = { headers, rows, cellStyles, headerRowIndex };
          }
        } catch (error) {
          console.error('Excel parsing error:', error);
          toast({ 
            title: `Error parsing ${file.name}`, 
            description: error instanceof Error ? error.message : 'Invalid Excel file',
            variant: 'destructive' 
          });
          continue;
        }
      } else {
        // CSV/TSV - existing logic
        const text = await file.text();
        parsed = parseCSV(text);
      }
      
      if (parsed.headers.length > 0) {
        parsedFiles.push({ ...parsed, fileName });
      }
    }
    
    if (parsedFiles.length === 0) {
      toast({ 
        title: 'No valid files', 
        description: 'Could not parse any uploaded files',
        variant: 'destructive' 
      });
      return;
    }
    
    setBatchImportData(parsedFiles);
    setImportAsNewTableDialog(true);
    e.target.value = '';
  };

  // Handle PDF file upload with AI extraction
  const handlePDFFileClick = () => {
    pdfFileInputRef.current?.click();
  };

  const handlePDFFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const extractedData = await extractMultipleFiles(Array.from(files));
    
    if (extractedData.length > 0) {
      setBatchImportData(extractedData);
      setImportAsNewTableDialog(true);
    }
    
    e.target.value = '';
  };

  const handleCreateTableFromImport = async () => {
    if (batchImportData.length === 0) return;
    
    setIsCreatingTableFromImport(true);
    let createdCount = 0;
    let lastTableId: string | null = null;
    
    try {
      const { data: user } = await supabase.auth.getUser();
      
      for (const importData of batchImportData) {
        const { data: newTable, error: tableError } = await supabase
          .from('custom_tables')
          .insert({
            name: importData.fileName.trim(),
            description: `Imported from ${importData.fileName}`,
            icon: 'table',
            created_by: user.user?.id,
          })
          .select()
          .single();
        
        if (tableError) throw tableError;

        // Create columns with detected types
        const columnInserts = importData.headers.map((header, index) => {
          // Try to detect column type from first few data rows
          let columnType: 'text' | 'number' | 'currency' | 'date' = 'text';
          const sampleValues = importData.rows.slice(0, 5).map(row => row[index]).filter(v => v);
          
          if (sampleValues.length > 0) {
            const allNumbers = sampleValues.every(v => !isNaN(parseFloat(v.replace(/[R$€£,\s]/g, ''))));
            const hasCurrency = sampleValues.some(v => /^[R$€£]/.test(v) || /ZAR|USD|EUR/.test(v));
            
            if (allNumbers && hasCurrency) {
              columnType = 'currency';
            } else if (allNumbers) {
              columnType = 'number';
            }
          }
          
          return {
            table_id: newTable.id,
            name: header.trim() || `Column ${index + 1}`,
            column_type: columnType,
            order_position: index,
            width: 150,
          };
        });

        const { data: createdColumns, error: colError } = await supabase
          .from('custom_columns')
          .insert(columnInserts)
          .select();
        
        if (colError) throw colError;

        // Create rows with data and styles
        if (importData.rows.length > 0 && createdColumns) {
          const rowInserts = importData.rows.map((rowData, rowIndex) => {
            const data: Record<string, any> = {};
            const styles: Record<string, any> = {};
            
            createdColumns.forEach((col, colIndex) => {
              const cellValue = rowData[colIndex] ?? '';
              data[col.id] = cellValue;
              
              // Map cell styles if available
              if (importData.cellStyles) {
                // ExcelJS 1-based indexing: header at headerRowIndex, data starts at headerRowIndex+1
                const headerOffset = (importData as any).headerRowIndex || 1;
                const excelRow = rowIndex + headerOffset + 1;
                const excelCol = colIndex < 26 
                  ? String.fromCharCode(65 + colIndex) 
                  : String.fromCharCode(64 + Math.floor(colIndex / 26)) + String.fromCharCode(65 + (colIndex % 26));
                const cellAddr = `${excelCol}${excelRow}`;
                
                if (importData.cellStyles[cellAddr]) {
                  styles[col.id] = importData.cellStyles[cellAddr];
                }
              }
            });
            
            return {
              table_id: newTable.id,
              data: Object.keys(styles).length > 0 ? { ...data, _styles: styles } : data,
              created_by: user.user?.id,
            };
          });

          const { error: rowError } = await supabase
            .from('custom_rows')
            .insert(rowInserts);
          
          if (rowError) throw rowError;
        }
        
        createdCount++;
        lastTableId = newTable.id;
      }

      toast({ 
        title: 'Import complete', 
        description: `Created ${createdCount} table${createdCount > 1 ? 's' : ''}` 
      });
      
      setBatchImportData([]);
      setImportAsNewTableDialog(false);
      
      if (lastTableId) {
        setSelectedTableId(lastTableId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['custom-tables'] });
    } catch (error: any) {
      console.error('Import error:', error);
      toast({ 
        title: 'Import failed', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsCreatingTableFromImport(false);
    }
  };

  // Load documents for a folder when browsing
  const loadFolderDocuments = async (folderId: string | null) => {
    setIsLoadingDocs(true);
    setBrowseFolderId(folderId);
    try {
      let query = supabase
        .from('uploaded_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }
      
      // Filter for CSV files
      query = query.or('file_type.eq.text/csv,file_name.ilike.%.csv');
      
      const { data, error } = await query;
      if (error) throw error;
      setFolderDocuments(data || []);
    } catch (error) {
      console.error('Error loading folder documents:', error);
      setFolderDocuments([]);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleImportFromFolderOpen = () => {
    setImportFromFolderDialog(true);
    loadFolderDocuments(null);
  };

  const handleSelectDocForImport = async (doc: any) => {
    setSelectedDocForImport(doc);
    try {
      // Download file from storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);
      
      if (error) throw error;
      
      const text = await data.text();
      const parsed = parseCSV(text);
      setImportFromFolderData(parsed);
    } catch (error: any) {
      toast({ title: 'Error loading file', description: error.message, variant: 'destructive' });
    }
  };

  const handleImportFromFolderConfirm = async () => {
    if (!selectedTableId || !importFromFolderData) return;

    // Create columns if they don't exist
    for (const header of importFromFolderData.headers) {
      const existingCol = columns.find(c => c.name.toLowerCase() === header.toLowerCase());
      if (!existingCol) {
        await addColumn.mutateAsync({ table_id: selectedTableId, name: header, column_type: 'text' });
      }
    }

    // Wait a bit for columns to be created
    await new Promise(resolve => setTimeout(resolve, 500));

    // Add rows
    for (const rowData of importFromFolderData.rows) {
      const data: Record<string, any> = {};
      importFromFolderData.headers.forEach((header, i) => {
        const col = columns.find(c => c.name.toLowerCase() === header.toLowerCase());
        if (col) {
          data[col.id] = rowData[i];
        }
      });
      await addRow.mutateAsync(data);
    }

    toast({ 
      title: 'Import complete', 
      description: `${importFromFolderData.rows.length} rows imported from ${selectedDocForImport?.file_name}` 
    });
    setImportFromFolderDialog(false);
    setImportFromFolderData(null);
    setSelectedDocForImport(null);
  };

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Ungrouped']));

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Render folder tree item for save dialog
  const renderSaveFolderItem = (folder: any, level: number): React.ReactNode => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedSaveFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer',
            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveFolder(folder.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Folder className="h-4 w-4" />
          <span className="text-sm truncate">{folder.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map((child: any) => renderSaveFolderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Table List */}
        <div className={cn(
          "border-r bg-card/50 flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}>
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Tables</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Import PDF with AI extraction"
                onClick={handlePDFFileClick}
                disabled={isExtracting}
              >
                {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Import CSV as new table"
                onClick={handleNewTableFileClick}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Create new table"
                onClick={() => setNewTableDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Hidden file inputs */}
          <input
            ref={pdfFileInputRef}
            type="file"
            accept=".pdf,.PDF,.xlsx,.xls"
            multiple
            className="hidden"
            onChange={handlePDFFileSelect}
          />
          {/* Hidden file input - now supports multiple files */}
          <input
            ref={newTableFileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.tsv"
            multiple
            className="hidden"
            onChange={handleNewTableFileSelect}
          />
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {Object.entries(groupedTables).map(([group, groupTables]) => (
                <div key={group}>
                  {group !== 'Ungrouped' && (
                    <button
                      className="flex items-center gap-1 px-2 py-1.5 w-full text-sm text-muted-foreground hover:text-foreground"
                      onClick={() => toggleGroup(group)}
                    >
                      <ChevronRight className={cn('h-3 w-3 transition-transform', expandedGroups.has(group) && 'rotate-90')} />
                      <FolderOpen className="h-3 w-3" />
                      <span>{group}</span>
                      <span className="ml-auto text-xs">({groupTables.length})</span>
                    </button>
                  )}
                  {(group === 'Ungrouped' || expandedGroups.has(group)) && groupTables.map((table) => (
                    <div
                      key={table.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer group',
                        group !== 'Ungrouped' && 'ml-4',
                        selectedTableId === table.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      )}
                      onClick={() => setSelectedTableId(table.id)}
                    >
                      <Table2 className="h-4 w-4" />
                      <div className="flex-1 min-w-0">
                        <span className="truncate text-sm block">{table.name}</span>
                        {table.description && (
                          <span className="text-xs text-muted-foreground truncate block">{table.description}</span>
                        )}
                      </div>
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
                              setRenameDialog({ 
                                open: true, 
                                tableId: table.id, 
                                name: table.name,
                                description: table.description || '',
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
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
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <Table2 className="h-5 w-5" />
                      <h1 className="text-xl font-semibold">{selectedTable.name}</h1>
                    </div>
                    {selectedTable.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selectedTable.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button variant="outline" size="sm" onClick={handleImportClick}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleImportFromFolderOpen}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Import from Folder
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={columns.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSaveToFolderOpen} disabled={columns.length === 0}>
                    <Save className="h-4 w-4 mr-2" />
                    Save to Folder
                  </Button>
                </div>
              </div>

              {/* Spreadsheet Grid - no wrapper, scrollbars align to edges */}
              <div className="flex-1 min-h-0">
                <SpreadsheetGrid
                  columns={columns}
                  rows={rows}
                  allTables={tables}
                  allTableData={allTableData}
                  onAddRow={() => addRow.mutate({})}
                  onUpdateRow={(rowId, data) => updateRow.mutate({ id: rowId, data })}
                  onDeleteRow={(rowId) => deleteRow.mutate(rowId)}
                  onAddColumn={(name, type, options) => addColumn.mutate({ table_id: selectedTableId!, name, column_type: type, options })}
                  onUpdateColumn={(columnId, updates) => updateColumn.mutate({ id: columnId, ...updates })}
                  onDeleteColumn={(columnId) => deleteColumn.mutate(columnId)}
                />
              </div>
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
            <DialogDescription>
              Create a spreadsheet-like table to organize your data
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Table Name</Label>
              <Input
                placeholder="e.g., Project Tracker"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTable()}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="What is this table for?"
                value={newTableDescription}
                onChange={(e) => setNewTableDescription(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTable} disabled={createTable.isPending}>
              Create Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Table Name</Label>
              <Input
                placeholder="Table name"
                value={renameDialog.name || ''}
                onChange={(e) => setRenameDialog({ ...renameDialog, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameTable()}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="What is this table for?"
                value={renameDialog.description || ''}
                onChange={(e) => setRenameDialog({ ...renameDialog, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleRenameTable}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import CSV</DialogTitle>
            <DialogDescription>
              Preview your data before importing
            </DialogDescription>
          </DialogHeader>
          {importData && (
            <div className="max-h-[400px] overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {importData.headers.map((header, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium border-b">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importData.rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 truncate max-w-[200px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {importData.rows.length > 10 && (
                <div className="p-2 text-center text-muted-foreground text-sm">
                  ... and {importData.rows.length - 10} more rows
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportConfirm}>
              Import {importData?.rows.length} Rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save to Folder Dialog */}
      <Dialog open={saveToFolderDialog} onOpenChange={(open) => {
        setSaveToFolderDialog(open);
        if (!open) {
          setIsCreatingFolder(false);
          setNewFolderName('');
          setCreateFolderParentId(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Table to Folder</DialogTitle>
            <DialogDescription>
              Export this table as a CSV file and save it to your document folders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File Name</Label>
              <Input
                placeholder="filename.csv"
                value={saveFileName}
                onChange={(e) => setSaveFileName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Select Folder</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setCreateFolderParentId(selectedFolderId);
                    setIsCreatingFolder(true);
                  }}
                >
                  <FolderPlus className="h-3 w-3 mr-1" />
                  {selectedFolderId ? 'New Subfolder' : 'New Folder'}
                </Button>
              </div>
              {isCreatingFolder && (
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder={createFolderParentId ? "Subfolder name" : "Folder name"}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        createFolder.mutate({ name: newFolderName.trim(), parent_id: createFolderParentId || undefined }, {
                          onSuccess: (data) => {
                            setSelectedFolderId(data.id);
                            if (createFolderParentId) {
                              setExpandedSaveFolders(prev => new Set(prev).add(createFolderParentId));
                            }
                            setNewFolderName('');
                            setIsCreatingFolder(false);
                            setCreateFolderParentId(null);
                          }
                        });
                      } else if (e.key === 'Escape') {
                        setNewFolderName('');
                        setIsCreatingFolder(false);
                        setCreateFolderParentId(null);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      if (newFolderName.trim()) {
                        createFolder.mutate({ name: newFolderName.trim(), parent_id: createFolderParentId || undefined }, {
                          onSuccess: (data) => {
                            setSelectedFolderId(data.id);
                            if (createFolderParentId) {
                              setExpandedSaveFolders(prev => new Set(prev).add(createFolderParentId));
                            }
                            setNewFolderName('');
                            setIsCreatingFolder(false);
                            setCreateFolderParentId(null);
                          }
                        });
                      }
                    }}
                    disabled={!newFolderName.trim() || createFolder.isPending}
                  >
                    {createFolder.isPending ? '...' : 'Create'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setNewFolderName('');
                      setIsCreatingFolder(false);
                      setCreateFolderParentId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
              {createFolderParentId && isCreatingFolder && (
                <p className="text-xs text-muted-foreground mb-2">
                  Creating inside: {folders.find(f => f.id === createFolderParentId)?.name || 'Root'}
                </p>
              )}
              <ScrollArea className="h-48 border rounded-md p-2">
                <div
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer',
                    selectedFolderId === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                  onClick={() => setSelectedFolderId(null)}
                >
                  <Folder className="h-4 w-4" />
                  <span className="text-sm">Root (No Folder)</span>
                </div>
                {folderTree.map((folder) => renderSaveFolderItem(folder, 0))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveToFolderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveToFolder} disabled={isSaving || !saveFileName.trim()}>
              {isSaving ? 'Saving...' : 'Save to Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Folder Dialog */}
      <Dialog open={importFromFolderDialog} onOpenChange={(open) => {
        setImportFromFolderDialog(open);
        if (!open) {
          setSelectedDocForImport(null);
          setImportFromFolderData(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {importFromFolderData ? 'Preview Import' : 'Import from Document Folder'}
            </DialogTitle>
            <DialogDescription>
              {importFromFolderData 
                ? `Preview data from ${selectedDocForImport?.file_name}`
                : 'Select a CSV file from your document folders to import'}
            </DialogDescription>
          </DialogHeader>
          
          {!importFromFolderData ? (
            <div className="space-y-4">
              {/* Folder Navigation */}
              <div className="flex items-center gap-2 border-b pb-2">
                {browseFolderId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const currentFolder = folders.find(f => f.id === browseFolderId);
                      loadFolderDocuments(currentFolder?.parent_id || null);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  {browseFolderId 
                    ? folders.find(f => f.id === browseFolderId)?.name || 'Folder'
                    : 'Root'}
                </span>
              </div>
              
              <ScrollArea className="h-64">
                {isLoadingDocs ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Show subfolders */}
                    {folders
                      .filter(f => f.parent_id === browseFolderId)
                      .map(folder => (
                        <div
                          key={folder.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted"
                          onClick={() => loadFolderDocuments(folder.id)}
                        >
                          <Folder className="h-4 w-4 text-primary" />
                          <span className="text-sm">{folder.name}</span>
                          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                        </div>
                      ))}
                    
                    {/* Show CSV files */}
                    {folderDocuments.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-muted"
                        onClick={() => handleSelectDocForImport(doc)}
                      >
                        <FileText className="h-4 w-4 text-green-500" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm block truncate">{doc.file_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {folders.filter(f => f.parent_id === browseFolderId).length === 0 && 
                     folderDocuments.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No CSV files in this folder</p>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {importFromFolderData.headers.map((header, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium border-b">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importFromFolderData.rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 truncate max-w-[200px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {importFromFolderData.rows.length > 10 && (
                <div className="p-2 text-center text-muted-foreground text-sm">
                  ... and {importFromFolderData.rows.length - 10} more rows
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            {importFromFolderData ? (
              <>
                <Button variant="outline" onClick={() => {
                  setImportFromFolderData(null);
                  setSelectedDocForImport(null);
                }}>
                  Back
                </Button>
                <Button onClick={handleImportFromFolderConfirm}>
                  Import {importFromFolderData.rows.length} Rows
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setImportFromFolderDialog(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import as New Table(s) Dialog - Batch Support for CSV and PDF */}
      <Dialog open={importAsNewTableDialog} onOpenChange={setImportAsNewTableDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import as New Table{batchImportData.length > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              {batchImportData.length > 1 
                ? `Create ${batchImportData.length} new tables from the imported files`
                : 'Create a new table with the imported data'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-auto">
            {batchImportData.map((importData, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="font-medium">{importData.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {importData.confidence && (
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        importData.confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        importData.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {importData.confidence} confidence
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {importData.headers.length} columns, {importData.rows.length} rows
                    </span>
                  </div>
                </div>
                
                {importData.documentType && (
                  <p className="text-xs text-muted-foreground">
                    Document type: <span className="font-medium">{importData.documentType}</span>
                    {importData.summary && ` — ${importData.summary.substring(0, 100)}${importData.summary.length > 100 ? '...' : ''}`}
                  </p>
                )}
                
                <div className="max-h-[150px] overflow-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {importData.headers.slice(0, 5).map((header, i) => (
                          <th key={i} className="px-2 py-1 text-left font-medium border-b text-xs">
                            {header || `Col ${i + 1}`}
                          </th>
                        ))}
                        {importData.headers.length > 5 && (
                          <th className="px-2 py-1 text-left font-medium border-b text-xs text-muted-foreground">
                            +{importData.headers.length - 5} more
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {importData.rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b">
                          {row.slice(0, 5).map((cell, j) => (
                            <td key={j} className="px-2 py-1 truncate max-w-[100px] text-xs">
                              {cell}
                            </td>
                          ))}
                          {row.length > 5 && (
                            <td className="px-2 py-1 text-xs text-muted-foreground">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importData.rows.length > 3 && (
                    <div className="p-1 text-center text-muted-foreground text-xs bg-muted/50">
                      ... +{importData.rows.length - 3} more rows
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setImportAsNewTableDialog(false);
                setBatchImportData([]);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTableFromImport} 
              disabled={isCreatingTableFromImport || batchImportData.length === 0}
            >
              {isCreatingTableFromImport 
                ? 'Creating...' 
                : `Create ${batchImportData.length} Table${batchImportData.length > 1 ? 's' : ''}`
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating AI Button */}
      {selectedTable && !showAIPanel && (
        <Button
          onClick={() => setShowAIPanel(true)}
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg z-40"
          size="icon"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      )}

      {/* AI Panel */}
      <WorkspaceAIPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        isExpanded={aiPanelExpanded}
        onToggleExpand={() => setAIPanelExpanded(!aiPanelExpanded)}
        context={{
          tableName: selectedTable?.name,
          columns: columns.map(c => ({ id: c.id, name: c.name, type: c.column_type })),
          rowCount: rows.length,
        }}
        onAction={(action) => {
          toast({ title: 'AI Action', description: `${action.type} applied to workspace` });
        }}
      />
    </AppLayout>
  );
}
