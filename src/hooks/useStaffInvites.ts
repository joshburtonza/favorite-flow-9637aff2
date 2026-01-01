import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  lead_user_id: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export interface StaffInvite {
  id: string;
  email: string;
  role: string;
  department_id: string | null;
  invited_by: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  department?: { id: string; name: string } | null;
  inviter?: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export function useDepartments() {
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Department[];
    },
  });

  const createDepartment = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name, description })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create department');
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Department> & { id: string }) => {
      const { data, error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update department');
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete department');
    },
  });

  return {
    departments,
    isLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}

export function useStaffInvites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['staff-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_invites')
        .select(`
          *,
          department:departments(id, name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch inviter profiles separately
      const inviterIds = [...new Set(data?.filter(i => i.invited_by).map(i => i.invited_by) || [])];
      let inviterProfiles: Record<string, any> = {};
      
      if (inviterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', inviterIds);
        
        inviterProfiles = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      }
      
      return (data || []).map(invite => ({
        ...invite,
        inviter: invite.invited_by ? inviterProfiles[invite.invited_by] : null,
      })) as unknown as StaffInvite[];
    },
    enabled: !!user,
  });

  const sendInvite = useMutation({
    mutationFn: async ({ 
      email, 
      role, 
      department_id 
    }: { 
      email: string; 
      role: string; 
      department_id: string | null;
    }) => {
      // Get current user's name for the invite email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user?.id)
        .single();
      
      const inviterName = profile?.full_name || profile?.email || 'A team administrator';
      
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await supabase.functions.invoke('send-staff-invite', {
        body: {
          email,
          role,
          department_id,
          inviter_name: inviterName,
        },
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to send invite');
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success(data.message || 'Invitation sent successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invite');
    },
  });

  const cancelInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('staff_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
      toast.success('Invite cancelled');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel invite');
    },
  });

  const resendInvite = useMutation({
    mutationFn: async (invite: StaffInvite) => {
      // Cancel old invite and create new one
      await supabase
        .from('staff_invites')
        .update({ status: 'cancelled' })
        .eq('id', invite.id);
      
      // Send new invite
      return sendInvite.mutateAsync({
        email: invite.email,
        role: invite.role,
        department_id: invite.department_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
    },
  });

  return {
    invites,
    isLoading,
    sendInvite,
    cancelInvite,
    resendInvite,
    pendingInvites: invites.filter(i => i.status === 'pending'),
  };
}

export function useInviteByToken(token: string | null) {
  return useQuery({
    queryKey: ['invite-by-token', token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase
        .from('staff_invites')
        .select(`
          *,
          department:departments(id, name)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        return { ...data, status: 'expired' };
      }
      
      return data as unknown as StaffInvite;
    },
    enabled: !!token,
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      token, 
      userId 
    }: { 
      token: string; 
      userId: string;
    }) => {
      // Get the invite
      const { data: invite, error: inviteError } = await supabase
        .from('staff_invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();
      
      if (inviteError || !invite) {
        throw new Error('Invalid or expired invite');
      }
      
      // Check expiration
      if (new Date(invite.expires_at) < new Date()) {
        throw new Error('This invite has expired');
      }
      
      // Assign role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ 
          user_id: userId, 
          role: invite.role 
        }, { 
          onConflict: 'user_id,role' 
        });
      
      if (roleError) throw roleError;
      
      // Update user's department
      if (invite.department_id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ department_id: invite.department_id })
          .eq('id', userId);
        
        if (profileError) throw profileError;
      }
      
      // Mark invite as accepted
      const { error: updateError } = await supabase
        .from('staff_invites')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', invite.id);
      
      if (updateError) throw updateError;
      
      return invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invites'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      toast.success('Welcome to the team!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept invite');
    },
  });
}
