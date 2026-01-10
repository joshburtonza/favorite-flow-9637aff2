import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneOverlayProps {
  isVisible: boolean;
  folderName?: string;
}

export function DropZoneOverlay({ isVisible, folderName }: DropZoneOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-background/80 backdrop-blur-sm',
        'border-4 border-dashed border-primary',
        'animate-in fade-in duration-200'
      )}
    >
      <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-card/90 border shadow-2xl">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Upload className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground">
            Drop files here to upload
          </h3>
          {folderName && (
            <p className="text-muted-foreground mt-1">
              Uploading to: <span className="font-medium text-foreground">{folderName}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Supports up to 50 files at once
          </p>
        </div>
      </div>
    </div>
  );
}
