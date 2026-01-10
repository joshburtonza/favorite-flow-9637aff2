import { useState } from 'react';
import { X, Check, AlertCircle, Loader2, ChevronDown, ChevronUp, File, Pause, Play, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'paused';
  progress: number;
  error?: string;
}

interface UploadQueueProps {
  items: UploadItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onClearCompleted: () => void;
  onCancelAll: () => void;
}

export function UploadQueue({
  items,
  onCancel,
  onRetry,
  onPause,
  onResume,
  onClearCompleted,
  onCancelAll,
}: UploadQueueProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  if (items.length === 0) return null;

  const completedCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const inProgressCount = items.filter(i => i.status === 'uploading').length;
  const totalProgress = items.reduce((acc, item) => acc + item.progress, 0) / items.length;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'success':
        return <Check className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-warning" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full shadow-lg"
          size="sm"
        >
          <Loader2 className={cn("h-4 w-4 mr-2", inProgressCount > 0 && "animate-spin")} />
          {inProgressCount > 0 ? `Uploading ${inProgressCount}...` : `${completedCount} completed`}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            Uploads ({items.length})
          </span>
          {inProgressCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(totalProgress)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {inProgressCount > 0 && (
        <Progress value={totalProgress} className="h-1 rounded-none" />
      )}

      {/* File list */}
      {isExpanded && (
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg text-sm',
                  item.status === 'error' && 'bg-destructive/10',
                  item.status === 'success' && 'bg-success/10'
                )}
              >
                {getStatusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{item.file.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(item.file.size)}
                    </span>
                    {item.status === 'uploading' && (
                      <span className="text-xs text-primary">{item.progress}%</span>
                    )}
                    {item.status === 'error' && item.error && (
                      <span className="text-xs text-destructive truncate">{item.error}</span>
                    )}
                  </div>
                  {item.status === 'uploading' && (
                    <Progress value={item.progress} className="h-1 mt-1" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {item.status === 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onPause(item.id)}
                    >
                      <Pause className="h-3 w-3" />
                    </Button>
                  )}
                  {item.status === 'paused' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onResume(item.id)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  )}
                  {item.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRetry(item.id)}
                    >
                      <RotateCw className="h-3 w-3" />
                    </Button>
                  )}
                  {(item.status === 'pending' || item.status === 'uploading' || item.status === 'paused') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onCancel(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between p-2 border-t bg-muted/30 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          {completedCount > 0 && <span className="text-success">{completedCount} completed</span>}
          {errorCount > 0 && <span className="text-destructive">{errorCount} failed</span>}
        </div>
        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClearCompleted}>
              Clear completed
            </Button>
          )}
          {(inProgressCount > 0 || items.filter(i => i.status === 'pending').length > 0) && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={onCancelAll}>
              Cancel all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
