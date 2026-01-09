import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, Pencil, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentFolder } from '@/hooks/useDocumentFolders';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/usePermissions';

interface FolderTreeProps {
  folders: DocumentFolder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveDocument?: (documentId: string, folderId: string | null) => void;
  onMoveFolder?: (folderId: string, newParentId: string | null) => void;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveDocument,
  onMoveFolder,
}: FolderTreeProps) {
  const { isAdmin } = usePermissions();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderDialog, setNewFolderDialog] = useState<{ open: boolean; parentId?: string }>({ open: false });
  const [renameDialog, setRenameDialog] = useState<{ open: boolean; folder?: DocumentFolder }>({ open: false });
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);

  const toggleExpand = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Check if targetId is a descendant of folderId
  const isDescendant = (folderId: string, targetId: string | null): boolean => {
    if (!targetId) return false;
    if (folderId === targetId) return true;
    
    const findDescendants = (folder: DocumentFolder): boolean => {
      if (folder.id === targetId) return true;
      return folder.children?.some(findDescendants) || false;
    };
    
    const sourceFolder = findFolderById(folders, folderId);
    if (!sourceFolder) return false;
    return sourceFolder.children?.some(findDescendants) || false;
  };

  const findFolderById = (folderList: DocumentFolder[], id: string): DocumentFolder | undefined => {
    for (const folder of folderList) {
      if (folder.id === id) return folder;
      if (folder.children) {
        const found = findFolderById(folder.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const handleDragStart = (e: React.DragEvent, type: 'folder' | 'document', id: string) => {
    e.dataTransfer.setData(type === 'folder' ? 'folderId' : 'documentId', id);
    e.dataTransfer.effectAllowed = 'move';
    if (type === 'folder') {
      setDraggingFolderId(id);
    }
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggingFolder = e.dataTransfer.types.includes('folderid');
    
    // Prevent dropping folder onto itself or its descendants
    if (draggingFolder && draggingFolderId) {
      if (folderId === draggingFolderId) return;
      if (folderId && isDescendant(draggingFolderId, folderId)) return;
    }
    
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolderId(null);
  };

  const handleDragEnd = () => {
    setDraggingFolderId(null);
    setDragOverFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    setDraggingFolderId(null);
    
    const documentId = e.dataTransfer.getData('documentId');
    const folderId = e.dataTransfer.getData('folderId');
    
    if (documentId && onMoveDocument) {
      onMoveDocument(documentId, targetFolderId);
    } else if (folderId && onMoveFolder) {
      // Prevent dropping folder onto itself
      if (folderId === targetFolderId) return;
      // Prevent dropping folder into its own descendant
      if (targetFolderId && isDescendant(folderId, targetFolderId)) return;
      onMoveFolder(folderId, targetFolderId);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderDialog.parentId);
      setNewFolderName('');
      setNewFolderDialog({ open: false });
    }
  };

  const handleRenameFolder = () => {
    if (newFolderName.trim() && renameDialog.folder) {
      onRenameFolder(renameDialog.folder.id, newFolderName.trim());
      setNewFolderName('');
      setRenameDialog({ open: false });
    }
  };

  const renderFolder = (folder: DocumentFolder, level: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isSystemFolder = folder.folder_type === 'system';
    const isDragging = draggingFolderId === folder.id;
    const isDragOver = dragOverFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          draggable={isAdmin && !isSystemFolder}
          onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
          onDragEnd={handleDragEnd}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group transition-colors',
            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
            isDragOver && 'ring-2 ring-primary bg-primary/5',
            isDragging && 'opacity-50',
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onSelectFolder(folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          {isAdmin && !isSystemFolder && (
            <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-50 cursor-grab" />
          )}
          
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          
          {isSelected ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )}
          
          <span className="flex-1 truncate text-sm">{folder.name}</span>
          
          {isAdmin && (
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
                    setNewFolderDialog({ open: true, parentId: folder.id });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Subfolder
                </DropdownMenuItem>
                {!isSystemFolder && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewFolderName(folder.name);
                        setRenameDialog({ open: true, folder });
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* All Documents */}
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
          selectedFolderId === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
          dragOverFolderId === 'root' && 'ring-2 ring-primary bg-primary/5',
        )}
        onClick={() => onSelectFolder(null)}
        onDragOver={(e) => handleDragOver(e, 'root')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      >
        <Folder className="h-4 w-4" />
        <span className="text-sm font-medium">All Documents</span>
      </div>

      {/* Folder Tree */}
      {folders.map(folder => renderFolder(folder))}

      {/* New Folder Button */}
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start mt-2"
          onClick={() => setNewFolderDialog({ open: true })}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Folder
        </Button>
      )}

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialog.open} onOpenChange={(open) => setNewFolderDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameDialog.open} onOpenChange={(open) => setRenameDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleRenameFolder}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
