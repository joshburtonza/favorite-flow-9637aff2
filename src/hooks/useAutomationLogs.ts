import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AutomationLog {
  id: string;
  source: string;
  action: string;
  lot_number: string | null;
  request_body: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  success: boolean;
  error: string | null;
  created_at: string;
}

export interface AutomationStats {
  totalToday: number;
  successToday: number;
  failedToday: number;
  lastTelegram: AutomationLog | null;
  lastEmail: AutomationLog | null;
  recentFailed: AutomationLog[];
}

export function useAutomationLogs() {
  return useQuery({
    queryKey: ['automation-logs'],
    queryFn: async (): Promise<AutomationStats> => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get today's logs
      const { data: todayLogs, error } = await supabase
        .from('automation_logs')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get last Telegram message
      const { data: lastTelegram } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('source', 'telegram')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get last email
      const { data: lastEmail } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('source', 'email')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get recent failed logs
      const { data: recentFailed } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('success', false)
        .order('created_at', { ascending: false })
        .limit(5);

      const logs = todayLogs || [];
      
      return {
        totalToday: logs.length,
        successToday: logs.filter(l => l.success).length,
        failedToday: logs.filter(l => !l.success).length,
        lastTelegram: lastTelegram as AutomationLog | null,
        lastEmail: lastEmail as AutomationLog | null,
        recentFailed: (recentFailed || []) as AutomationLog[]
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useAutomationLogsList() {
  return useQuery({
    queryKey: ['automation-logs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AutomationLog[];
    },
    refetchInterval: 30000,
  });
}
