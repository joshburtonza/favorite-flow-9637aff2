import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Loader2, FileText, Image, FileSpreadsheet, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileDown, PanelLeftClose, PanelLeft, Columns2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FileViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    extracted_data?: any;
  } | null;
}

interface SpreadsheetData {
  headers: string[];
  rows: string[][];
}

type ViewMode = 'split' | 'document' | 'data';

export function FileViewerModal({ open, onOpenChange, document }: FileViewerModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // View mode - split, document only, or data only
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  
  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.0);

  // Spreadsheet zoom and column resize state
  const [spreadsheetZoom, setSpreadsheetZoom] = useState<number>(100);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [resizing, setResizing] = useState<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const isSpreadsheet = document?.file_name?.match(/\.(xlsx|xls|csv)$/i);
  const isImage = document?.file_type?.startsWith('image/');
  const isPDF = document?.file_type === 'application/pdf' || document?.file_name?.endsWith('.pdf');
  
  // Determine if we should show split view (PDF/image with extracted data)
  const canShowSplit = (isPDF || isImage) && (spreadsheetData || document?.extracted_data);
  const isDocumentWithData = isPDF || isImage;

  useEffect(() => {
    if (open && document) {
      loadFile();
      // Default to split view for documents with data, otherwise just document/data view
      if (isSpreadsheet) {
        setViewMode('data');
      } else {
        setViewMode('split');
      }
    } else {
      setFileUrl(null);
      setPdfData(null);
      setSpreadsheetData(null);
      setPageNumber(1);
      setNumPages(0);
      setPdfScale(1.0);
      setSpreadsheetZoom(100);
      setColumnWidths([]);
    }
  }, [open, document]);

  // Initialize column widths when spreadsheet data loads
  useEffect(() => {
    if (spreadsheetData) {
      setColumnWidths(spreadsheetData.headers.map(() => 150));
    }
  }, [spreadsheetData]);

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      colIndex,
      startX: e.clientX,
      startWidth: columnWidths[colIndex] || 150,
    });
  }, [columnWidths]);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(60, Math.min(500, resizing.startWidth + diff));
      setColumnWidths(prev => {
        const updated = [...prev];
        updated[resizing.colIndex] = newWidth;
        return updated;
      });
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  const loadFile = async () => {
    if (!document) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      if (isSpreadsheet) {
        // Parse spreadsheet
        const buffer = await data.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

        if (jsonData.length > 0) {
          const headers = (jsonData[0] as any[]).map((h, i) => h ? String(h) : `Column ${i + 1}`);
          const rows = jsonData.slice(1).map(row =>
            headers.map((_, i) => String((row as any)[i] ?? ''))
          );
          setSpreadsheetData({ headers, rows });
        }
      } else if (isPDF) {
        // Store PDF as ArrayBuffer for react-pdf
        const buffer = await data.arrayBuffer();
        setPdfData(buffer);
        
        // Also check for extracted data to show in split view
        if (document.extracted_data) {
          const extractedData = document.extracted_data;
          // Convert extracted data object to spreadsheet format for display
          if (extractedData && typeof extractedData === 'object') {
            const entries = Object.entries(extractedData).filter(([key]) => 
              !key.startsWith('_') && key !== 'raw_text'
            );
            if (entries.length > 0) {
              setSpreadsheetData({
                headers: ['Field', 'Value'],
                rows: entries.map(([key, value]) => [
                  key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  String(value ?? '')
                ])
              });
            }
          }
        }
      } else if (isImage) {
        // Create blob URL for preview
        const url = URL.createObjectURL(data);
        setFileUrl(url);
        
        // Also check for extracted data to show in split view
        if (document.extracted_data) {
          const extractedData = document.extracted_data;
          if (extractedData && typeof extractedData === 'object') {
            const entries = Object.entries(extractedData).filter(([key]) => 
              !key.startsWith('_') && key !== 'raw_text'
            );
            if (entries.length > 0) {
              setSpreadsheetData({
                headers: ['Field', 'Value'],
                rows: entries.map(([key, value]) => [
                  key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  String(value ?? '')
                ])
              });
            }
          }
        }
      } else {
        // Create blob URL for preview
        const url = URL.createObjectURL(data);
        setFileUrl(url);
      }
    } catch (error: any) {
      toast({
        title: 'Failed to load file',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Download started' });
    } catch (error: any) {
      toast({ title: 'Download failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleCellClick = (rowIndex: number, colIndex: number, value: string) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setEditValue(value);
  };

  const handleCellBlur = () => {
    if (editingCell && spreadsheetData) {
      const newRows = [...spreadsheetData.rows];
      newRows[editingCell.row] = [...newRows[editingCell.row]];
      newRows[editingCell.row][editingCell.col] = editValue;
      setSpreadsheetData({ ...spreadsheetData, rows: newRows });
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
  const pdfZoomIn = () => setPdfScale(prev => Math.min(prev + 0.25, 3));
  const pdfZoomOut = () => setPdfScale(prev => Math.max(prev - 0.25, 0.5));

  // Spreadsheet zoom controls
  const spreadsheetZoomIn = () => setSpreadsheetZoom(prev => Math.min(prev + 10, 200));
  const spreadsheetZoomOut = () => setSpreadsheetZoom(prev => Math.max(prev - 10, 50));
  const resetSpreadsheetZoom = () => setSpreadsheetZoom(100);

  // Export spreadsheet functions
  const exportToCSV = () => {
    if (!spreadsheetData || !document) return;
    
    const csvContent = [
      spreadsheetData.headers.join(','),
      ...spreadsheetData.rows.map(row => 
        row.map(cell => {
          const escaped = cell.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
            ? `"${escaped}"` 
            : escaped;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    const baseName = document.file_name.replace(/\.(xlsx|xls|csv|pdf)$/i, '');
    a.href = url;
    a.download = `${baseName}_data.csv`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exported to CSV' });
  };

  const exportToXLSX = () => {
    if (!spreadsheetData || !document) return;
    
    const wsData = [spreadsheetData.headers, ...spreadsheetData.rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const baseName = document.file_name.replace(/\.(xlsx|xls|csv|pdf)$/i, '');
    XLSX.writeFile(wb, `${baseName}_data.xlsx`);
    
    toast({ title: 'Exported to XLSX' });
  };

  // Render the document preview panel
  const renderDocumentPreview = () => {
    if (isPDF && pdfData) {
      return (
        <div className="h-full flex flex-col">
          {/* PDF controls */}
          <div className="flex items-center justify-center gap-2 py-2 border-b bg-muted/30 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {pageNumber} / {numPages}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button variant="outline" size="sm" onClick={pdfZoomOut} disabled={pdfScale <= 0.5}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(pdfScale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={pdfZoomIn} disabled={pdfScale >= 3}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto flex justify-center p-4 bg-muted/20">
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
              error={<p className="text-destructive">Failed to load PDF</p>}
            >
              <Page
                pageNumber={pageNumber}
                scale={pdfScale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      );
    }

    if (isImage && fileUrl) {
      return (
        <div className="h-full overflow-auto flex items-center justify-center p-4 bg-muted/20">
          <img
            src={fileUrl}
            alt={document?.file_name}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Preview not available</p>
      </div>
    );
  };

  // Render the data/spreadsheet panel
  const renderDataPanel = () => {
    if (!spreadsheetData) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
          <p className="text-muted-foreground">No extracted data available</p>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {/* Spreadsheet controls */}
        <div className="flex items-center justify-center gap-2 py-2 border-b bg-muted/30 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={spreadsheetZoomOut} disabled={spreadsheetZoom <= 50}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <button 
            onClick={resetSpreadsheetZoom}
            className="text-xs w-12 text-center hover:text-primary transition-colors"
          >
            {spreadsheetZoom}%
          </button>
          <Button variant="outline" size="sm" onClick={spreadsheetZoomIn} disabled={spreadsheetZoom >= 200}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <FileDown className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToXLSX}>
            <FileDown className="h-4 w-4 mr-1" />
            XLSX
          </Button>
        </div>
        {/* Scrollable table container */}
        <div className="flex-1 overflow-auto">
          <div style={{ 
            width: `${100 * (spreadsheetZoom / 100)}%`,
            transformOrigin: 'top left'
          }}>
            <table 
              ref={tableRef}
              className="border-collapse w-full"
              style={{ fontSize: `${14 * (spreadsheetZoom / 100)}px` }}
            >
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th 
                    className="border-b border-r p-2 text-center text-xs font-medium text-muted-foreground sticky left-0 bg-muted z-20"
                    style={{ width: 40, minWidth: 40 }}
                  >
                    #
                  </th>
                  {spreadsheetData.headers.map((header, i) => (
                    <th
                      key={i}
                      className="border-b border-r text-left text-sm font-medium relative group"
                      style={{ width: columnWidths[i] || 150, minWidth: 60 }}
                    >
                      <div className="p-2 break-words whitespace-normal pr-3">{header}</div>
                      <div
                        className={cn(
                          "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors",
                          resizing?.colIndex === i && "bg-primary"
                        )}
                        onMouseDown={(e) => handleResizeStart(e, i)}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spreadsheetData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-muted/30">
                    <td 
                      className="border-b border-r p-2 text-center text-xs text-muted-foreground sticky left-0 bg-background z-10"
                      style={{ width: 40, minWidth: 40 }}
                    >
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => (
                      <td
                        key={colIndex}
                        className={cn(
                          "border-b border-r p-0 align-top",
                          editingCell?.row === rowIndex && editingCell?.col === colIndex && "ring-2 ring-primary ring-inset"
                        )}
                        style={{ width: columnWidths[colIndex] || 150, minWidth: 60 }}
                        onClick={() => handleCellClick(rowIndex, colIndex, cell)}
                      >
                        {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                          <textarea
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full min-h-[40px] px-2 py-1 bg-background outline-none resize-none text-sm"
                          />
                        ) : (
                          <div className="px-2 py-1 text-sm break-words whitespace-normal cursor-pointer min-h-[32px]">
                            {cell}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSpreadsheet ? (
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
              ) : isImage ? (
                <Image className="h-5 w-5 text-blue-500" />
              ) : isPDF ? (
                <FileText className="h-5 w-5 text-red-500" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
              <DialogTitle className="text-lg">{document?.file_name}</DialogTitle>
              {isPDF && numPages > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {numPages} pages
                </Badge>
              )}
              {spreadsheetData && (
                <Badge variant="secondary" className="text-xs">
                  {spreadsheetData.rows.length} rows
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggles for documents with data */}
              {isDocumentWithData && spreadsheetData && (
                <div className="flex items-center border rounded-md overflow-hidden mr-2">
                  <Button 
                    variant={viewMode === 'document' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('document')}
                    className="rounded-none h-8 px-2"
                    title="Document Only"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={viewMode === 'split' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('split')}
                    className="rounded-none h-8 px-2"
                    title="Split View"
                  >
                    <Columns2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={viewMode === 'data' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('data')}
                    className="rounded-none h-8 px-2"
                    title="Data Only"
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Original
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isSpreadsheet ? (
            // Pure spreadsheet files - show data only
            renderDataPanel()
          ) : isDocumentWithData ? (
            // PDFs/Images - show based on view mode
            <div className="h-full flex">
              {/* Document panel */}
              {(viewMode === 'split' || viewMode === 'document') && (
                <div className={cn(
                  "h-full border-r",
                  viewMode === 'split' ? 'w-1/2' : 'w-full'
                )}>
                  {renderDocumentPreview()}
                </div>
              )}
              {/* Data panel */}
              {(viewMode === 'split' || viewMode === 'data') && (
                <div className={cn(
                  "h-full",
                  viewMode === 'split' ? 'w-1/2' : 'w-full'
                )}>
                  {renderDataPanel()}
                </div>
              )}
            </div>
          ) : fileUrl ? (
            // Generic file preview
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">Preview not available for this file type</p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download to View
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No file loaded</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
