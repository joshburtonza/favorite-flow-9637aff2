import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentFolder {
  id: string;
  name: string;
  parent_id: string | null;
  folder_type: 'system' | 'staff' | 'clearing_agent' | 'custom';
  assigned_staff_id: string | null;
  order_position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  children?: DocumentFolder[];
}

export function useDocumentFolders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading, refetch } = useQuery({
    queryKey: ['document-folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_folders')
        .select('*')
        .order('order_position');
      
      if (error) throw error;
      return data as DocumentFolder[];
    },
  });

  // Build folder tree structure
  const folderTree = buildFolderTree(folders);

  const createFolder = useMutation({
    mutationFn: async (folder: { name: string; parent_id?: string; folder_type?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          name: folder.name,
          parent_id: folder.parent_id || null,
          folder_type: (folder.folder_type as any) || 'custom',
          created_by: user.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      toast({ title: 'Folder created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating folder', description: error.message, variant: 'destructive' });
    },
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('document_folders')
        .update({ name })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      toast({ title: 'Folder renamed' });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_folders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      toast({ title: 'Folder deleted' });
    },
  });

  const moveDocument = useMutation({
    mutationFn: async ({ documentId, folderId }: { documentId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('uploaded_documents')
        .update({ folder_id: folderId })
        .eq('id', documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-documents'] });
      toast({ title: 'Document moved' });
    },
  });

  const moveFolder = useMutation({
    mutationFn: async ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) => {
      // Prevent moving folder to itself
      if (folderId === newParentId) {
        throw new Error('Cannot move folder into itself');
      }
      
      // Check if new parent is a descendant of the folder being moved
      if (newParentId) {
        const isDescendant = checkIsDescendant(folders, folderId, newParentId);
        if (isDescendant) {
          throw new Error('Cannot move folder into its own subfolder');
        }
      }
      
      const { error } = await supabase
        .from('document_folders')
        .update({ parent_id: newParentId })
        .eq('id', folderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      toast({ title: 'Folder moved successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error moving folder', description: error.message, variant: 'destructive' });
    },
  });

  const updateDocumentStatus = useMutation({
    mutationFn: async ({ documentId, status }: { documentId: string; status: 'new' | 'in_progress' | 'finalized' }) => {
      const { error } = await supabase
        .from('uploaded_documents')
        .update({ status })
        .eq('id', documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folder-documents'] });
      toast({ title: 'Document status updated' });
    },
  });

  return {
    folders,
    folderTree,
    isLoading,
    refetch,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDocument,
    moveFolder,
    updateDocumentStatus,
  };
}

// Check if targetId is a descendant of folderId
function checkIsDescendant(folders: DocumentFolder[], folderId: string, targetId: string): boolean {
  const folder = folders.find(f => f.id === targetId);
  if (!folder) return false;
  if (folder.parent_id === folderId) return true;
  if (folder.parent_id) {
    return checkIsDescendant(folders, folderId, folder.parent_id);
  }
  return false;
}

function buildFolderTree(folders: DocumentFolder[]): DocumentFolder[] {
  const folderMap = new Map<string, DocumentFolder>();
  const rootFolders: DocumentFolder[] = [];

  // Create a map of all folders with children array
  folders.forEach(folder => {
    folderMap.set(folder.id, { ...folder, children: [] });
  });

  // Build tree structure
  folders.forEach(folder => {
    const currentFolder = folderMap.get(folder.id)!;
    if (folder.parent_id && folderMap.has(folder.parent_id)) {
      folderMap.get(folder.parent_id)!.children!.push(currentFolder);
    } else if (!folder.parent_id) {
      rootFolders.push(currentFolder);
    }
  });

  return rootFolders;
}

export function useFolderDocuments(folderId: string | null) {
  return useQuery({
    queryKey: ['folder-documents', folderId],
    queryFn: async () => {
      let query = supabase
        .from('uploaded_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else {
        query = query.is('folder_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
