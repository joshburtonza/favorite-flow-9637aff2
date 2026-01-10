import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { UploadItem } from '@/components/file-manager/UploadQueue';

const MAX_CONCURRENT_UPLOADS = 3;
const MAX_FILES = 50;

export function useFileUpload(folderId: string | null) {
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length > MAX_FILES) {
      toast({
        title: 'Too many files',
        description: `Maximum ${MAX_FILES} files allowed per upload`,
        variant: 'destructive',
      });
      return;
    }

    const newItems: UploadItem[] = fileArray.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
      progress: 0,
    }));

    setUploadQueue(prev => [...prev, ...newItems]);
  }, [toast]);

  const uploadFile = useCallback(async (item: UploadItem): Promise<boolean> => {
    const file = item.file;
    const fileExt = file.name.split('.').pop();
    const filePath = `${crypto.randomUUID()}.${fileExt}`;

    try {
      // Update status to uploading
      setUploadQueue(prev =>
        prev.map(i => i.id === item.id ? { ...i, status: 'uploading' as const } : i)
      );

      // Simulate progress for now (real progress requires XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadQueue(prev =>
          prev.map(i => {
            if (i.id === item.id && i.status === 'uploading' && i.progress < 90) {
              return { ...i, progress: i.progress + 10 };
            }
            return i;
          })
        );
      }, 200);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      // Get user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert document record
      const { error: insertError } = await supabase
        .from('uploaded_documents')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          folder_id: folderId,
          uploaded_by: user?.id,
          status: 'new',
          original_name: file.name,
        });

      if (insertError) throw insertError;

      // Update status to success
      setUploadQueue(prev =>
        prev.map(i => i.id === item.id ? { ...i, status: 'success' as const, progress: 100 } : i)
      );

      return true;
    } catch (error: any) {
      console.error('Upload error:', error);
      
      setUploadQueue(prev =>
        prev.map(i => i.id === item.id ? { 
          ...i, 
          status: 'error' as const, 
          error: error.message || 'Upload failed' 
        } : i)
      );

      return false;
    }
  }, [folderId]);

  const processQueue = useCallback(async () => {
    if (isUploading) return;
    
    setIsUploading(true);
    
    const pendingItems = uploadQueue.filter(i => i.status === 'pending');
    
    // Process in batches
    for (let i = 0; i < pendingItems.length; i += MAX_CONCURRENT_UPLOADS) {
      const batch = pendingItems.slice(i, i + MAX_CONCURRENT_UPLOADS);
      await Promise.all(batch.map(uploadFile));
    }
    
    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ['folder-documents'] });
    
    // Show summary toast
    const results = uploadQueue.filter(i => i.status === 'success' || i.status === 'error');
    const successCount = results.filter(i => i.status === 'success').length;
    const errorCount = results.filter(i => i.status === 'error').length;
    
    if (successCount > 0 || errorCount > 0) {
      toast({
        title: 'Upload complete',
        description: `${successCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        variant: errorCount > 0 && successCount === 0 ? 'destructive' : 'default',
      });
    }
  }, [isUploading, uploadQueue, uploadFile, queryClient, toast]);

  const cancelUpload = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(i => i.id !== id));
  }, []);

  const retryUpload = useCallback((id: string) => {
    setUploadQueue(prev =>
      prev.map(i => i.id === id ? { ...i, status: 'pending' as const, progress: 0, error: undefined } : i)
    );
  }, []);

  const pauseUpload = useCallback((id: string) => {
    setUploadQueue(prev =>
      prev.map(i => i.id === id ? { ...i, status: 'paused' as const } : i)
    );
  }, []);

  const resumeUpload = useCallback((id: string) => {
    setUploadQueue(prev =>
      prev.map(i => i.id === id ? { ...i, status: 'pending' as const } : i)
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadQueue(prev => prev.filter(i => i.status !== 'success'));
  }, []);

  const cancelAll = useCallback(() => {
    setUploadQueue(prev => prev.filter(i => i.status === 'success' || i.status === 'error'));
  }, []);

  const clearQueue = useCallback(() => {
    setUploadQueue([]);
  }, []);

  return {
    uploadQueue,
    isUploading,
    addFilesToQueue,
    processQueue,
    cancelUpload,
    retryUpload,
    pauseUpload,
    resumeUpload,
    clearCompleted,
    cancelAll,
    clearQueue,
  };
}
