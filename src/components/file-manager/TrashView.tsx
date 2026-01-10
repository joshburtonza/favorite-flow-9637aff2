import { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTrash } from '@/hooks/useTrash';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function TrashView() {
  const { trashedFiles, isLoading, restoreFromTrash, permanentDelete, emptyTrash } = useTrash();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (trashedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Trash2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-foreground">Trash is empty</h3>
        <p className="text-muted-foreground mt-1">
          Deleted files will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Trash</h2>
          <span className="text-sm text-muted-foreground">
            ({trashedFiles.length} items)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  selectedIds.forEach(id => restoreFromTrash.mutate(id));
                  setSelectedIds(new Set());
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore ({selectedIds.size})
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Empty Trash
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Empty Trash?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {trashedFiles.length} items in the trash.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => emptyTrash.mutate()}
                >
                  Empty Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        Items in trash will be permanently deleted after 30 days
      </div>

      {/* File list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {trashedFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                'hover:bg-accent/50',
                selectedIds.has(file.id) && 'bg-primary/10 border-primary/30'
              )}
              onClick={() => toggleSelect(file.id)}
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.file_size)} · Deleted {formatDistanceToNow(new Date(file.updated_at || ''), { addSuffix: true })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreFromTrash.mutate(file.id);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{file.file_name}" will be permanently deleted. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => permanentDelete.mutate(file.id)}
                      >
                        Delete Forever
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
