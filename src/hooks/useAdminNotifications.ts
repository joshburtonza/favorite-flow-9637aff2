import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

interface AdminNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  severity: string;
  user_id: string | null;
  user_email: string | null;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

export function useAdminNotifications() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user || !isAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          setNotifications(prev => [payload.new as AdminNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
