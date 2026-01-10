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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FileCardDocument } from './FileCard';

interface FileRowProps {
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

const getFileExtension = (fileName: string) => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toUpperCase() : '-';
};

export function FileRow({
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
}: FileRowProps) {
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
        'group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all',
        'hover:bg-accent/50',
        isSelected && 'bg-primary/10 hover:bg-primary/15'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox */}
      <Checkbox 
        checked={isSelected}
        className="opacity-0 group-hover:opacity-100 transition-opacity data-[state=checked]:opacity-100"
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={() => onSelect(document.id, true, false)}
      />

      {/* File icon */}
      <div className={cn('w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0', fileColor)}>
        <FileIcon className="w-4 h-4" />
      </div>

      {/* File name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{document.file_name}</span>
          {document.is_favorite && (
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          )}
        </div>
        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex gap-1 mt-0.5">
            {document.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Type */}
      <div className="w-16 text-xs text-muted-foreground text-center flex-shrink-0">
        {getFileExtension(document.file_name)}
      </div>

      {/* Size */}
      <div className="w-20 text-xs text-muted-foreground text-right flex-shrink-0">
        {formatFileSize(document.file_size)}
      </div>

      {/* Date */}
      <div className="w-24 text-xs text-muted-foreground text-right flex-shrink-0">
        {document.uploaded_at 
          ? format(new Date(document.uploaded_at), 'MMM d, yyyy')
          : '-'
        }
      </div>

      {/* Quick actions */}
      <div className={cn(
        'flex items-center gap-1 opacity-0 transition-opacity',
        isHovered && 'opacity-100'
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(document.id);
          }}
        >
          <Star className={cn(
            'h-4 w-4',
            document.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
          )} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onDownload(document);
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
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
    </div>
  );
}
