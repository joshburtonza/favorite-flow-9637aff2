import React, { useState, useCallback } from 'react';
import { Upload, Grid, List, Search, ChevronRight, Home } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocumentFolders, useFolderDocuments } from '@/hooks/useDocumentFolders';
import { FolderTree } from '@/components/files/FolderTree';
import { FileGrid } from '@/components/files/FileGrid';
import { FileViewerModal } from '@/components/files/FileViewerModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function FileBrowser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
  } | null>(null);

  const {
    folders,
    folderTree,
    isLoading: foldersLoading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDocument,
    updateDocumentStatus,
  } = useDocumentFolders();

  const { data: documents = [], isLoading: documentsLoading } = useFolderDocuments(selectedFolderId);

  // Get breadcrumb path
  const getBreadcrumbPath = useCallback(() => {
    if (!selectedFolderId) return [];
    
    const path: { id: string; name: string }[] = [];
    let currentId: string | null = selectedFolderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parent_id;
      } else {
        break;
      }
    }
    
    return path;
  }, [selectedFolderId, folders]);

  const breadcrumbPath = getBreadcrumbPath();

  // Filter documents by search
  const filteredDocuments = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.lot_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle file upload (increased to 50 files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 50) {
      toast({
        title: 'Too many files',
        description: 'You can upload up to 50 files at a time',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from('uploaded_documents')
          .insert({
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            folder_id: selectedFolderId,
            status: 'new',
          });

        if (insertError) throw insertError;
        successCount++;
      } catch (error) {
        console.error('Upload error:', error);
        errorCount++;
      }
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ['folder-documents'] });

    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `${successCount} file(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });
    } else {
      toast({
        title: 'Upload failed',
        description: 'No files were uploaded',
        variant: 'destructive',
      });
    }

    e.target.value = '';
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Folder Tree */}
        <div className="w-64 border-r bg-card/50 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Folders</h2>
          </div>
          <ScrollArea className="flex-1 p-2">
            <FolderTree
              folders={folderTree}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onCreateFolder={(name, parentId) => createFolder.mutate({ name, parent_id: parentId })}
              onRenameFolder={(id, name) => renameFolder.mutate({ id, name })}
              onDeleteFolder={(id) => deleteFolder.mutate(id)}
              onMoveDocument={(docId, folderId) => moveDocument.mutate({ documentId: docId, folderId })}
            />
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b flex items-center gap-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setSelectedFolderId(null)}
              >
                <Home className="h-4 w-4" />
              </Button>
              {breadcrumbPath.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setSelectedFolderId(item.id)}
                  >
                    {item.name}
                  </Button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* View Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload Button */}
            <label>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button asChild disabled={uploading}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Files'}
                </span>
              </Button>
            </label>
          </div>

          {/* File Grid/List */}
          <ScrollArea className="flex-1 p-4">
            {documentsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <FileGrid
                documents={filteredDocuments as any}
                folders={folderTree}
                viewMode={viewMode}
                onMoveDocument={(docId, folderId) => moveDocument.mutate({ documentId: docId, folderId })}
                onUpdateStatus={(docId, status) => updateDocumentStatus.mutate({ documentId: docId, status })}
                onOpenFile={(doc) => setSelectedDocument(doc)}
              />
            )}
          </ScrollArea>
        </div>
      </div>

      {/* File Viewer Modal */}
      <FileViewerModal
        open={!!selectedDocument}
        onOpenChange={(open) => !open && setSelectedDocument(null)}
        document={selectedDocument}
      />
    </AppLayout>
  );
}
