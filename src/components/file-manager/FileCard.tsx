import { useState } from 'react';
import { 
  FileText, FileSpreadsheet, FileImage, FileVideo, FileAudio, 
  File, MoreVertical, Star, Download, Share2, Trash2, Eye,
  FolderInput, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface FileCardDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string | null;
  status?: string | null;
  is_favorite?: boolean;
  tags?: string[];
}

interface FileCardProps {
  document: FileCardDocument;
  isSelected: boolean;
  onSelect: (id: string, ctrlKey: boolean, shiftKey: boolean) => void;
  onOpen: (doc: FileCardDocument) => void;
  onToggleFavorite: (id: string) => void;
  onDownload: (doc: FileCardDocument) => void;
  onShare: (doc: FileCardDocument) => void;
  onMove: (id: string) => void;
  onDelete: (id: string) => void;
  onAddTags: (id: string) => void;
}

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet;
  if (fileType.includes('image')) return FileImage;
  if (fileType.includes('video')) return FileVideo;
  if (fileType.includes('audio')) return FileAudio;
  
  return File;
};

const getFileColor = (fileType: string | null) => {
  if (!fileType) return 'text-muted-foreground';
  
  if (fileType.includes('pdf')) return 'text-red-500';
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'text-green-500';
  if (fileType.includes('image')) return 'text-purple-500';
  if (fileType.includes('video')) return 'text-blue-500';
  if (fileType.includes('audio')) return 'text-orange-500';
  if (fileType.includes('document') || fileType.includes('word')) return 'text-blue-600';
  
  return 'text-muted-foreground';
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FileCard({
  document,
  isSelected,
  onSelect,
  onOpen,
  onToggleFavorite,
  onDownload,
  onShare,
  onMove,
  onDelete,
  onAddTags,
}: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const FileIcon = getFileIcon(document.file_type);
  const fileColor = getFileColor(document.file_type);

  const handleClick = (e: React.MouseEvent) => {
    onSelect(document.id, e.ctrlKey || e.metaKey, e.shiftKey);
  };

  const handleDoubleClick = () => {
    onOpen(document);
  };

  return (
    <div
      className={cn(
        'group relative p-4 rounded-xl border cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/30',
        isSelected && 'ring-2 ring-primary border-primary bg-primary/5',
        !isSelected && 'bg-card hover:bg-accent/50'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Favorite star */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute top-2 left-2 h-7 w-7 opacity-0 transition-opacity',
          (isHovered || document.is_favorite) && 'opacity-100'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(document.id);
        }}
      >
        <Star
          className={cn(
            'h-4 w-4',
            document.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          )}
        />
      </Button>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute top-2 right-2 h-7 w-7 opacity-0 transition-opacity',
              isHovered && 'opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onOpen(document)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload(document)}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onShare(document)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onMove(document.id)}>
            <FolderInput className="h-4 w-4 mr-2" />
            Move to...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddTags(document.id)}>
            <Tag className="h-4 w-4 mr-2" />
            Add tags
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onDelete(document.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* File icon */}
      <div className="flex justify-center mb-3 pt-4">
        <div className={cn('w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center', fileColor)}>
          <FileIcon className="w-8 h-8" />
        </div>
      </div>

      {/* File info */}
      <div className="text-center">
        <p className="font-medium text-sm truncate mb-1" title={document.file_name}>
          {document.file_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(document.file_size)}
          {document.uploaded_at && (
            <> · {formatDistanceToNow(new Date(document.uploaded_at), { addSuffix: true })}</>
          )}
        </p>
      </div>

      {/* Tags */}
      {document.tags && document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 justify-center">
          {document.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {document.tags.length > 2 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              +{document.tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Status badge */}
      {document.status && document.status !== 'new' && (
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="text-xs">
            {document.status}
          </Badge>
        </div>
      )}
    </div>
  );
}
