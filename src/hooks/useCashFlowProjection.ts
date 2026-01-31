import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PaymentProjection {
  id: string;
  supplier_name: string;
  amount_foreign: number;
  currency: string;
  payment_date: string;
  lot_number?: string;
  days_until_due: number;
  is_overdue: boolean;
}

interface CashFlowData {
  weeks_ahead: number;
  total_outflow: number;
  payment_count: number;
  payments: PaymentProjection[];
  weekly_breakdown?: {
    week: number;
    start_date: string;
    end_date: string;
    total: number;
    payments: PaymentProjection[];
  }[];
}

export function useCashFlowProjection(weeksAhead: number = 4) {
  return useQuery({
    queryKey: ['cash-flow-projection', weeksAhead],
    queryFn: async (): Promise<CashFlowData> => {
      const { data, error } = await supabase.functions.invoke('flair-orchestrator', {
        body: {
          message: `Generate cash flow projection for next ${weeksAhead} weeks`,
          channel: 'web',
          tool_override: {
            tool: 'report_cash_flow',
            params: { weeks_ahead: weeksAhead }
          }
        }
      });

      if (error) throw error;
      
      // Extract from tool results
      const cashFlowResult = data.tool_results?.find(
        (r: any) => r.tool === 'report_cash_flow'
      );
      
      if (cashFlowResult?.result?.data) {
        const result = cashFlowResult.result.data;
        
        // Build weekly breakdown
        const now = new Date();
        const weeklyBreakdown = [];
        
        for (let w = 0; w < weeksAhead; w++) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() + (w * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          const weekPayments = (result.payments || []).filter((p: any) => {
            const pDate = new Date(p.payment_date);
            return pDate >= weekStart && pDate <= weekEnd;
          });
          
          weeklyBreakdown.push({
            week: w + 1,
            start_date: weekStart.toISOString().split('T')[0],
            end_date: weekEnd.toISOString().split('T')[0],
            total: weekPayments.reduce((sum: number, p: any) => sum + (p.amount_foreign || 0), 0),
            payments: weekPayments
          });
        }
        
        return {
          ...result,
          weekly_breakdown: weeklyBreakdown
        };
      }
      
      return {
        weeks_ahead: weeksAhead,
        total_outflow: 0,
        payment_count: 0,
        payments: [],
        weekly_breakdown: []
      };
    },
    staleTime: 60000 // Cache for 1 minute
  });
}

export function useDailyBriefing() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('flair-daily-briefing', {
        body: { channel: 'web' }
      });

      if (error) throw error;
      return data;
    }
  });
}

export function useProactiveAlertsSummary() {
  return useQuery({
    queryKey: ['proactive-alerts-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proactive_alerts')
        .select('id, alert_type, severity, title, message, created_at, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      return {
        alerts: data || [],
        counts: {
          critical: data?.filter(a => a.severity === 'critical').length || 0,
          urgent: data?.filter(a => a.severity === 'urgent').length || 0,
          warning: data?.filter(a => a.severity === 'warning').length || 0,
          info: data?.filter(a => a.severity === 'info').length || 0
        },
        total: data?.length || 0
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });
}
