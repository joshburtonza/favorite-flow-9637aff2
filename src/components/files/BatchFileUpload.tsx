import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useUserProfile } from '@/hooks/useDepartmentFiles';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface BatchFileUploadProps {
  folderId?: string | null;
  departmentId?: string | null;
  onComplete?: () => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  className?: string;
}

export function BatchFileUpload({
  folderId,
  departmentId,
  onComplete,
  maxFiles = 50,
  maxFileSize = 20 * 1024 * 1024, // 20MB
  allowedTypes,
  className,
}: BatchFileUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useUserProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const effectiveDepartmentId = departmentId || profile?.department_id;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles: UploadFile[] = [];
    const errors: string[] = [];

    newFiles.forEach((file) => {
      // Check max files
      if (files.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File too large (max ${maxFileSize / 1024 / 1024}MB)`);
        return;
      }

      // Check file type
      if (allowedTypes && !allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed`);
        return;
      }

      // Check for duplicates
      const isDuplicate = files.some(f => f.file.name === file.name && f.file.size === file.size);
      if (isDuplicate) {
        errors.push(`${file.name}: Already added`);
        return;
      }

      validFiles.push({
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
      });
    });

    if (errors.length > 0) {
      toast({
        title: 'Some files could not be added',
        description: errors.slice(0, 3).join('\n'),
        variant: 'destructive',
      });
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const uploadFile of pendingFiles) {
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'uploading' as const, progress: 50 } : f
        ));

        const fileExt = uploadFile.file.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, uploadFile.file);

        if (uploadError) throw uploadError;

        // Create document record
        const { error: insertError } = await supabase
          .from('uploaded_documents')
          .insert({
            file_name: uploadFile.file.name,
            file_path: filePath,
            file_type: uploadFile.file.type,
            file_size: uploadFile.file.size,
            folder_id: folderId || null,
            department_id: effectiveDepartmentId || null,
            status: 'new',
          });

        if (insertError) throw insertError;

        // Update status to success
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'success' as const, progress: 100 } : f
        ));
        successCount++;
      } catch (error: any) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id 
            ? { ...f, status: 'error' as const, error: error.message } 
            : f
        ));
        errorCount++;
      }
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ['folder-documents'] });
    queryClient.invalidateQueries({ queryKey: ['department-documents'] });

    toast({
      title: 'Upload complete',
      description: `${successCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount > 0 ? 'destructive' : 'default',
    });

    if (successCount > 0) {
      onComplete?.();
    }
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          'hover:border-primary/50 cursor-pointer'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Drop files here or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">
          Up to {maxFiles} files, max {maxFileSize / 1024 / 1024}MB each
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{files.length} files</span>
              {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
              {successCount > 0 && <Badge variant="default">{successCount} uploaded</Badge>}
              {errorCount > 0 && <Badge variant="destructive">{errorCount} failed</Badge>}
            </div>
            <div className="flex gap-2">
              {successCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCompleted}>
                  Clear completed
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
                Clear all
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-4 space-y-2">
              {files.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    uploadFile.status === 'success' && 'bg-green-50 border-green-200 dark:bg-green-950/20',
                    uploadFile.status === 'error' && 'bg-red-50 border-red-200 dark:bg-red-950/20'
                  )}
                >
                  <div className="flex-shrink-0">
                    {uploadFile.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : uploadFile.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : uploadFile.status === 'uploading' ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.file.size / 1024).toFixed(1)} KB
                      {uploadFile.error && (
                        <span className="text-destructive ml-2">{uploadFile.error}</span>
                      )}
                    </p>
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="h-1 mt-1" />
                    )}
                  </div>

                  {uploadFile.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={uploadFiles}
            disabled={pendingCount === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading ({uploadingCount})...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
