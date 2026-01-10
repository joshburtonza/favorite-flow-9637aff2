import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRecentFiles(limit = 20) {
  const queryClient = useQueryClient();

  // Fetch recent files
  const { data: recentFiles = [], isLoading } = useQuery({
    queryKey: ['recent-files', limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get recent file access logs with document details
      const { data, error } = await supabase
        .from('file_access_log')
        .select(`
          id,
          accessed_at,
          action_type,
          document:uploaded_documents (
            id,
            file_name,
            file_path,
            file_type,
            file_size,
            uploaded_at,
            status,
            folder_id
          )
        `)
        .eq('user_id', user.id)
        .order('accessed_at', { ascending: false })
        .limit(limit * 2); // Get more to handle duplicates

      if (error) throw error;

      // Deduplicate by document ID and keep most recent
      const seen = new Set<string>();
      const unique = (data || [])
        .filter(item => {
          if (!item.document) return false;
          const docId = (item.document as any).id;
          if (seen.has(docId)) return false;
          seen.add(docId);
          return true;
        })
        .slice(0, limit)
        .map(item => ({
          ...item.document,
          last_accessed: item.accessed_at,
          action_type: item.action_type,
        }));

      return unique;
    },
  });

  // Log file access
  const logAccess = useMutation({
    mutationFn: async ({ documentId, actionType = 'view' }: { documentId: string; actionType?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('file_access_log')
        .insert({
          user_id: user.id,
          document_id: documentId,
          action_type: actionType,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-files'] });
    },
  });

  // Clear access history
  const clearHistory = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('file_access_log')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-files'] });
    },
  });

  // Group by date
  const groupedByDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { label: string; files: typeof recentFiles }[] = [
      { label: 'Today', files: [] },
      { label: 'Yesterday', files: [] },
      { label: 'This Week', files: [] },
      { label: 'Earlier', files: [] },
    ];

    recentFiles.forEach((file: any) => {
      const accessDate = new Date(file.last_accessed);
      accessDate.setHours(0, 0, 0, 0);

      if (accessDate.getTime() === today.getTime()) {
        groups[0].files.push(file);
      } else if (accessDate.getTime() === yesterday.getTime()) {
        groups[1].files.push(file);
      } else if (accessDate >= lastWeek) {
        groups[2].files.push(file);
      } else {
        groups[3].files.push(file);
      }
    });

    return groups.filter(g => g.files.length > 0);
  };

  return {
    recentFiles,
    isLoading,
    logAccess,
    clearHistory,
    groupedByDate,
  };
}
