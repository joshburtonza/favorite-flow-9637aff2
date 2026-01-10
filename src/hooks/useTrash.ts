import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTrash() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch trashed documents
  const { data: trashedFiles = [], isLoading } = useQuery({
    queryKey: ['trash-files'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('status', 'deleted')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Move to trash (soft delete)
  const moveToTrash = useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('uploaded_documents')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) throw error;

      // Log activity
      await supabase.from('file_activity_log').insert({
        user_id: user?.id,
        action_type: 'trash',
        item_type: 'file',
        item_id: documentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-documents'] });
      queryClient.invalidateQueries({ queryKey: ['trash-files'] });
      toast({
        title: 'Moved to trash',
        description: 'File moved to trash. You can restore it within 30 days.',
        action: undefined, // Could add undo action here
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Restore from trash
  const restoreFromTrash = useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('uploaded_documents')
        .update({ 
          status: 'new',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) throw error;

      // Log activity
      await supabase.from('file_activity_log').insert({
        user_id: user?.id,
        action_type: 'restore',
        item_type: 'file',
        item_id: documentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-documents'] });
      queryClient.invalidateQueries({ queryKey: ['trash-files'] });
      toast({
        title: 'Restored',
        description: 'File has been restored.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Permanently delete
  const permanentDelete = useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get file path first
      const { data: doc } = await supabase
        .from('uploaded_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (doc?.file_path) {
        // Delete from storage
        await supabase.storage
          .from('documents')
          .remove([doc.file_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('uploaded_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      // Log activity
      await supabase.from('file_activity_log').insert({
        user_id: user?.id,
        action_type: 'permanent_delete',
        item_type: 'file',
        item_id: documentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-files'] });
      toast({
        title: 'Permanently deleted',
        description: 'File has been permanently deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Empty trash
  const emptyTrash = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Get all trashed files
      const { data: docs } = await supabase
        .from('uploaded_documents')
        .select('id, file_path')
        .eq('status', 'deleted');

      if (docs && docs.length > 0) {
        // Delete from storage
        const filePaths = docs.map(d => d.file_path).filter(Boolean);
        if (filePaths.length > 0) {
          await supabase.storage
            .from('documents')
            .remove(filePaths);
        }

        // Delete from database
        const { error } = await supabase
          .from('uploaded_documents')
          .delete()
          .eq('status', 'deleted');

        if (error) throw error;

        // Log activity
        await supabase.from('file_activity_log').insert({
          user_id: user?.id,
          action_type: 'empty_trash',
          item_type: 'file',
          details: { count: docs.length },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-files'] });
      toast({
        title: 'Trash emptied',
        description: 'All items in trash have been permanently deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    trashedFiles,
    isLoading,
    moveToTrash,
    restoreFromTrash,
    permanentDelete,
    emptyTrash,
    trashCount: trashedFiles.length,
  };
}
