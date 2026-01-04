import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText, Image, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
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

interface FileViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
  } | null;
}

interface SpreadsheetData {
  headers: string[];
  rows: string[][];
}

export function FileViewerModal({ open, onOpenChange, document }: FileViewerModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  const isSpreadsheet = document?.file_name?.match(/\.(xlsx|xls|csv)$/i);
  const isImage = document?.file_type?.startsWith('image/');
  const isPDF = document?.file_type === 'application/pdf' || document?.file_name?.endsWith('.pdf');

  useEffect(() => {
    if (open && document) {
      loadFile();
    } else {
      setFileUrl(null);
      setSpreadsheetData(null);
    }
  }, [open, document]);

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
        // Create blob URL with proper PDF MIME type for iframe
        const pdfBlob = new Blob([data], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);
        setFileUrl(url + '#toolbar=1&navpanes=0');
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
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
              <DialogTitle className="text-lg">{document?.file_name}</DialogTitle>
              {isSpreadsheet && (
                <Badge variant="secondary" className="text-xs">
                  {spreadsheetData?.rows.length || 0} rows × {spreadsheetData?.headers.length || 0} cols
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isSpreadsheet && spreadsheetData ? (
            // Spreadsheet view with full scroll
            <div className="h-full overflow-auto">
              <table className="border-collapse min-w-max">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr>
                    <th className="w-12 min-w-[48px] border-b border-r p-2 text-center text-xs font-medium text-muted-foreground sticky left-0 bg-muted z-20">
                      #
                    </th>
                    {spreadsheetData.headers.map((header, i) => (
                      <th
                        key={i}
                        className="border-b border-r p-2 text-left text-sm font-medium min-w-[120px]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spreadsheetData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-muted/30">
                      <td className="border-b border-r p-2 text-center text-xs text-muted-foreground sticky left-0 bg-background z-10">
                        {rowIndex + 1}
                      </td>
                      {row.map((cell, colIndex) => (
                        <td
                          key={colIndex}
                          className={cn(
                            "border-b border-r p-0 h-10 min-w-[120px]",
                            editingCell?.row === rowIndex && editingCell?.col === colIndex && "ring-2 ring-primary ring-inset"
                          )}
                          onClick={() => handleCellClick(rowIndex, colIndex, cell)}
                        >
                          {editingCell?.row === rowIndex && editingCell?.col === colIndex ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellBlur}
                              onKeyDown={handleKeyDown}
                              className="w-full h-full px-2 bg-background outline-none"
                            />
                          ) : (
                            <div className="px-2 py-2 text-sm truncate cursor-pointer">
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
          ) : isImage && fileUrl ? (
            // Image preview with scroll
            <div className="h-full overflow-auto flex items-center justify-center p-4 bg-muted/20">
              <img
                src={fileUrl}
                alt={document?.file_name}
                className="max-w-none"
                style={{ maxHeight: 'none' }}
              />
            </div>
          ) : isPDF && fileUrl ? (
            // PDF preview
            <iframe
              src={fileUrl}
              className="w-full h-full"
              title={document?.file_name}
            />
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
