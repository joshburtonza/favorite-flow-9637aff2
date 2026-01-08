import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export type AnnouncementPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TargetAudience = 'all' | 'admin' | 'staff' | 'moderator' | 'accountant' | 'shipping' | 'file_costing' | 'operations';

export interface Announcement {
  id: string;
  created_by: string | null;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target_audience: TargetAudience;
  is_pinned: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    full_name: string | null;
    email: string | null;
  };
  is_read?: boolean;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  target_audience?: TargetAudience;
  is_pinned?: boolean;
  expires_at?: string | null;
}

export function useAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data: announcementsData, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get read status for current user
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user?.id || '');

      const readIds = new Set(reads?.map(r => r.announcement_id) || []);

      // Get creator profiles
      const creatorIds = [...new Set(announcementsData?.map(a => a.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (announcementsData || []).map(a => ({
        ...a,
        is_read: readIds.has(a.id),
        creator_profile: a.created_by ? profileMap.get(a.created_by) : undefined
      })) as Announcement[];
    },
    enabled: !!user
  });

  // Real-time subscription with notifications for new announcements
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('announcements-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        refetch();
        // Show notification for new announcement
        const newAnnouncement = payload.new as any;
        if (newAnnouncement.created_by !== user.id) {
          const priorityEmoji = {
            urgent: '🚨',
            high: '❗',
            normal: '📢',
            low: 'ℹ️'
          }[newAnnouncement.priority as string] || '📢';
          
          toast.message(`${priorityEmoji} New Announcement`, {
            description: newAnnouncement.title,
            action: {
              label: 'View',
              onClick: () => window.location.href = '/announcements'
            }
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'announcements' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, user]);

  const createAnnouncement = useMutation({
    mutationFn: async (input: CreateAnnouncementInput) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          ...input,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement created');
    },
    onError: (error) => {
      toast.error('Failed to create announcement: ' + error.message);
    }
  });

  const updateAnnouncement = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Announcement> & { id: string }) => {
      const { data, error } = await supabase
        .from('announcements')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement updated');
    },
    onError: (error) => {
      toast.error('Failed to update announcement: ' + error.message);
    }
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete announcement: ' + error.message);
    }
  });

  const markAsRead = useMutation({
    mutationFn: async (announcementId: string) => {
      const { error } = await supabase
        .from('announcement_reads')
        .upsert({
          announcement_id: announcementId,
          user_id: user?.id
        }, { onConflict: 'announcement_id,user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    }
  });

  const unreadCount = announcements.filter(a => !a.is_read).length;

  return {
    announcements,
    isLoading,
    unreadCount,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    markAsRead,
    refetch
  };
}
