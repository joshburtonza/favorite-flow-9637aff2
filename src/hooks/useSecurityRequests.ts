import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

interface SecurityRequest {
  id: string;
  user_id: string;
  user_email: string;
  request_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  expires_at: string | null;
  created_at: string;
  metadata: any;
}

export function useSecurityRequests() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [requests, setRequests] = useState<SecurityRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching security requests:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('security-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'security_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const createRequest = async (params: {
    request_type: string;
    entity_type: string;
    entity_id?: string;
    entity_name?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }) => {
    if (!user) {
      toast.error('You must be logged in to make requests');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('security_requests')
        .insert({
          user_id: user.id,
          user_email: user.email || 'unknown',
          ...params,
        })
        .select()
        .single();

      if (error) throw error;

      // Create admin notification
      await supabase.from('admin_notifications').insert({
        notification_type: 'download_request',
        title: `${params.request_type.toUpperCase()} Request`,
        message: `${user.email} requested to ${params.request_type} ${params.entity_name || params.entity_type}`,
        severity: 'info',
        user_id: user.id,
        user_email: user.email,
        metadata: params,
      });

      toast.success('Request submitted for admin approval');
      return data;
    } catch (err: any) {
      console.error('Error creating security request:', err);
      toast.error(err.message || 'Failed to submit request');
      return null;
    }
  };

  const approveRequest = async (requestId: string, notes?: string) => {
    if (!user || !isAdmin) {
      toast.error('Only admins can approve requests');
      return false;
    }

    try {
      const { error } = await supabase
        .from('security_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hour expiry
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request approved');
      return true;
    } catch (err: any) {
      console.error('Error approving request:', err);
      toast.error(err.message || 'Failed to approve request');
      return false;
    }
  };

  const denyRequest = async (requestId: string, notes?: string) => {
    if (!user || !isAdmin) {
      toast.error('Only admins can deny requests');
      return false;
    }

    try {
      const { error } = await supabase
        .from('security_requests')
        .update({
          status: 'denied',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request denied');
      return true;
    } catch (err: any) {
      console.error('Error denying request:', err);
      toast.error(err.message || 'Failed to deny request');
      return false;
    }
  };

  const checkApproval = async (
    requestType: string,
    entityType: string,
    entityId?: string
  ): Promise<boolean> => {
    if (!user) return false;

    // Admins always have approval
    if (isAdmin) return true;

    try {
      let query = supabase
        .from('security_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('request_type', requestType)
        .eq('entity_type', entityType)
        .eq('status', 'approved')
        .gt('expires_at', new Date().toISOString());

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error('Error checking approval:', err);
      return false;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return {
    requests,
    loading,
    pendingCount,
    createRequest,
    approveRequest,
    denyRequest,
    checkApproval,
    refetch: fetchRequests,
  };
}
