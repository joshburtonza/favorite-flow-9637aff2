import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, MoreVertical, FolderInput, Download, Trash2, CheckCircle, Clock, AlertCircle, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SecureDownloadButton } from '@/components/security/SecureDownloadButton';
import { DocumentFolder } from '@/hooks/useDocumentFolders';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  document_type: string | null;
  uploaded_at: string | null;
  lot_number: string | null;
  supplier_name: string | null;
  client_name: string | null;
  status: 'new' | 'in_progress' | 'finalized' | null;
  folder_id: string | null;
}

interface FileGridProps {
  documents: Document[];
  folders: DocumentFolder[];
  viewMode: 'grid' | 'list';
  onMoveDocument: (documentId: string, folderId: string | null) => void;
  onUpdateStatus: (documentId: string, status: 'new' | 'in_progress' | 'finalized') => void;
  onDeleteDocument?: (documentId: string) => void;
}

export function FileGrid({
  documents,
  folders,
  viewMode,
  onMoveDocument,
  onUpdateStatus,
  onDeleteDocument,
}: FileGridProps) {
  const { toast } = useToast();
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, docId: string) => {
    setDraggedDocId(docId);
    e.dataTransfer.setData('documentId', docId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedDocId(null);
  };

  const handleSecureDownload = async (document: Document) => {
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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="text-blue-500 border-blue-500"><Clock className="h-3 w-3 mr-1" />New</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'finalized':
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="h-3 w-3 mr-1" />Finalized</Badge>;
      default:
        return null;
    }
  };

  const flattenFolders = (folders: DocumentFolder[], level = 0): { folder: DocumentFolder; level: number }[] => {
    let result: { folder: DocumentFolder; level: number }[] = [];
    for (const folder of folders) {
      result.push({ folder, level });
      if (folder.children && folder.children.length > 0) {
        result = result.concat(flattenFolders(folder.children, level + 1));
      }
    }
    return result;
  };

  const allFolders = flattenFolders(folders);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4" />
        <p>No documents in this folder</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            draggable
            onDragStart={(e) => handleDragStart(e, doc.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "group relative p-4 rounded-lg border bg-card hover:shadow-md transition-all cursor-grab active:cursor-grabbing",
              draggedDocId === doc.id && "opacity-50 ring-2 ring-primary"
            )}
          >
            <div className="flex flex-col items-center text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm font-medium truncate w-full">{doc.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.uploaded_at && format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
              </p>
              {doc.status && <div className="mt-2">{getStatusBadge(doc.status)}</div>}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <SecureDownloadButton
                  entityType="document"
                  entityId={doc.id}
                  entityName={doc.file_name}
                  onApproved={() => handleSecureDownload(doc)}
                />
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move to Folder
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onMoveDocument(doc.id, null)}>
                      📁 Root (Unfiled)
                    </DropdownMenuItem>
                    {allFolders.map(({ folder, level }) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => onMoveDocument(doc.id, folder.id)}
                        style={{ paddingLeft: `${level * 12 + 8}px` }}
                      >
                        📁 {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Set Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onUpdateStatus(doc.id, 'new')}>
                      <Clock className="h-4 w-4 mr-2 text-blue-500" />
                      New
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(doc.id, 'in_progress')}>
                      <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(doc.id, 'finalized')}>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Finalized
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {onDeleteDocument && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteDocument(doc.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-1">
      {documents.map((doc) => (
        <div
          key={doc.id}
          draggable
          onDragStart={(e) => handleDragStart(e, doc.id)}
          onDragEnd={handleDragEnd}
          className={cn(
            "flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 group cursor-grab active:cursor-grabbing",
            draggedDocId === doc.id && "opacity-50 ring-2 ring-primary"
          )}
        >
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{doc.file_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {doc.lot_number && <span>LOT {doc.lot_number}</span>}
              {doc.supplier_name && <span>• {doc.supplier_name}</span>}
              {doc.document_type && <span>• {doc.document_type}</span>}
            </div>
          </div>
          {doc.status && getStatusBadge(doc.status)}
          <span className="text-xs text-muted-foreground">
            {doc.uploaded_at && format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <SecureDownloadButton
                entityType="document"
                entityId={doc.id}
                entityName={doc.file_name}
                onApproved={() => handleSecureDownload(doc)}
              />
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="h-4 w-4 mr-2" />
                  Move to Folder
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onMoveDocument(doc.id, null)}>
                    📁 Root (Unfiled)
                  </DropdownMenuItem>
                  {allFolders.map(({ folder, level }) => (
                    <DropdownMenuItem
                      key={folder.id}
                      onClick={() => onMoveDocument(doc.id, folder.id)}
                      style={{ paddingLeft: `${level * 12 + 8}px` }}
                    >
                      📁 {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Set Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onUpdateStatus(doc.id, 'new')}>
                    <Clock className="h-4 w-4 mr-2 text-blue-500" />
                    New
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateStatus(doc.id, 'in_progress')}>
                    <AlertCircle className="h-4 w-4 mr-2 text-yellow-500" />
                    In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateStatus(doc.id, 'finalized')}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Finalized
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {onDeleteDocument && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDeleteDocument(doc.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
