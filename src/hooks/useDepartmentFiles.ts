import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  department_id: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
}

export function useUserProfile() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, department_id, departments:department_id(id, name)')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        department: Array.isArray(data.departments) ? data.departments[0] : data.departments
      } as UserProfile;
    },
    enabled: !!user?.id,
  });
}

export function useDepartmentFolders() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { data: profile } = useUserProfile();
  
  return useQuery({
    queryKey: ['department-folders', user?.id, profile?.department_id, isAdmin],
    queryFn: async () => {
      // Query is now filtered by RLS based on department
      const { data, error } = await supabase
        .from('document_folders')
        .select('*')
        .order('order_position');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useDepartmentDocuments(folderId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['department-documents', folderId, user?.id],
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
    enabled: !!user?.id,
  });
}

export function useAllDepartments() {
  return useQuery({
    queryKey: ['all-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, description')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}
