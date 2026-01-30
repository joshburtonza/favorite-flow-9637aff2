import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface UserChannelIdentity {
  id: string;
  user_id: string;
  channel: 'telegram' | 'whatsapp' | 'slack' | 'web';
  channel_user_id: string;
  display_name: string | null;
  is_verified: boolean;
  is_active: boolean;
  receive_alerts: boolean;
  receive_briefings: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLogEntry {
  id: string;
  user_id: string | null;
  channel: string;
  channel_user_id: string;
  notification_type: 'alert' | 'briefing' | 'update' | 'reminder' | 'message';
  alert_id: string | null;
  title: string | null;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered' | 'read';
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export function useUserChannels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current user's channel identities
  const { data: channels, isLoading, error } = useQuery({
    queryKey: ['user-channels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_channel_identities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UserChannelIdentity[];
    },
    enabled: !!user?.id
  });

  // Update channel preferences
  const updateChannel = useMutation({
    mutationFn: async ({ 
      channelId, 
      updates 
    }: { 
      channelId: string; 
      updates: Partial<UserChannelIdentity> 
    }) => {
      const { data, error } = await supabase
        .from('user_channel_identities')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', channelId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-channels'] });
      toast.success('Channel preferences updated');
    },
    onError: (error) => {
      toast.error('Failed to update channel: ' + (error as Error).message);
    }
  });

  // Deactivate a channel
  const deactivateChannel = useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase
        .from('user_channel_identities')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', channelId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-channels'] });
      toast.success('Channel deactivated');
    },
    onError: (error) => {
      toast.error('Failed to deactivate channel: ' + (error as Error).message);
    }
  });

  return {
    channels,
    isLoading,
    error,
    updateChannel,
    deactivateChannel,
    hasActiveChannel: (type: 'telegram' | 'whatsapp') => 
      channels?.some(c => c.channel === type && c.is_active) ?? false
  };
}

export function useNotificationLog(limit = 50) {
  const { user } = useAuth();

  const { data: notifications, isLoading, error, refetch } = useQuery({
    queryKey: ['notification-log', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as NotificationLogEntry[];
    },
    enabled: !!user?.id
  });

  const stats = {
    total: notifications?.length ?? 0,
    sent: notifications?.filter(n => n.status === 'sent').length ?? 0,
    failed: notifications?.filter(n => n.status === 'failed').length ?? 0,
    alerts: notifications?.filter(n => n.notification_type === 'alert').length ?? 0,
    briefings: notifications?.filter(n => n.notification_type === 'briefing').length ?? 0
  };

  return {
    notifications,
    isLoading,
    error,
    refetch,
    stats
  };
}

// Hook to trigger a manual briefing
export function useTriggerBriefing() {
  return useMutation({
    mutationFn: async (briefingType: 'morning' | 'evening' = 'morning') => {
      const { data, error } = await supabase.functions.invoke('flair-daily-briefing', {
        body: { briefing_type: briefingType }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Briefing sent to ${data.notifications?.sent_count ?? 0} recipients`);
    },
    onError: (error) => {
      toast.error('Failed to send briefing: ' + (error as Error).message);
    }
  });
}
