import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type AlertSeverity = 'info' | 'warning' | 'urgent' | 'critical';
type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

interface ProactiveAlert {
  id: string;
  alert_type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  action_required: boolean;
  suggested_action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_reference: string | null;
  target_user_id: string | null;
  target_role: string | null;
  notified_via: string[];
  notified_at: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  expires_at: string | null;
}

export function useProactiveAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('proactive_alerts')
        .select('*')
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Type cast the data properly
      const typedAlerts = (data || []).map(alert => ({
        ...alert,
        severity: alert.severity as AlertSeverity,
        status: alert.status as AlertStatus,
        notified_via: (alert.notified_via as string[]) || [],
        metadata: (alert.metadata as Record<string, unknown>) || {},
      }));
      
      setAlerts(typedAlerts);
    } catch (err) {
      console.error('Error fetching proactive alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('proactive-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proactive_alerts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAlert = {
              ...payload.new,
              severity: payload.new.severity as AlertSeverity,
              status: payload.new.status as AlertStatus,
              notified_via: (payload.new.notified_via as string[]) || [],
              metadata: (payload.new.metadata as Record<string, unknown>) || {},
            } as ProactiveAlert;
            setAlerts(prev => [newAlert, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAlerts(prev =>
              prev.map(a => a.id === payload.new.id ? {
                ...payload.new,
                severity: payload.new.severity as AlertSeverity,
                status: payload.new.status as AlertStatus,
                notified_via: (payload.new.notified_via as string[]) || [],
                metadata: (payload.new.metadata as Record<string, unknown>) || {},
              } as ProactiveAlert : a)
            );
          } else if (payload.eventType === 'DELETE') {
            setAlerts(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await supabase
        .from('proactive_alerts')
        .update({ 
          status: 'acknowledged' as AlertStatus,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id 
        })
        .eq('id', alertId);

      setAlerts(prev =>
        prev.map(a => a.id === alertId ? { ...a, status: 'acknowledged' as AlertStatus } : a)
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    try {
      await supabase
        .from('proactive_alerts')
        .update({ 
          status: 'resolved' as AlertStatus,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: notes || null
        })
        .eq('id', alertId);

      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await supabase
        .from('proactive_alerts')
        .update({ status: 'dismissed' as AlertStatus })
        .eq('id', alertId);

      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const urgentCount = alerts.filter(a => a.severity === 'urgent' || a.severity === 'critical').length;

  return {
    alerts,
    loading,
    activeCount,
    urgentCount,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    refetch: fetchAlerts,
  };
}
