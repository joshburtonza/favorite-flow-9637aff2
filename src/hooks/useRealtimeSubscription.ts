import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'shipments' | 'shipment_costs' | 'supplier_ledger' | 'automation_logs' | 'payment_schedule' | 'suppliers';

interface RealtimeConfig {
  tables: TableName[];
  onUpdate?: (table: TableName, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  showToasts?: boolean;
}

export function useRealtimeSubscription({ tables, onUpdate, showToasts = true }: RealtimeConfig) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel('db-changes');

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);
          
          // Invalidate relevant queries
          switch (table) {
            case 'shipments':
              queryClient.invalidateQueries({ queryKey: ['shipments'] });
              queryClient.invalidateQueries({ queryKey: ['shipment'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
              break;
            case 'shipment_costs':
              queryClient.invalidateQueries({ queryKey: ['shipments'] });
              queryClient.invalidateQueries({ queryKey: ['shipment'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
              break;
            case 'supplier_ledger':
              queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
              queryClient.invalidateQueries({ queryKey: ['suppliers'] });
              break;
            case 'automation_logs':
              queryClient.invalidateQueries({ queryKey: ['automation-logs'] });
              queryClient.invalidateQueries({ queryKey: ['automation-logs-list'] });
              break;
            case 'payment_schedule':
              queryClient.invalidateQueries({ queryKey: ['payments'] });
              break;
            case 'suppliers':
              queryClient.invalidateQueries({ queryKey: ['suppliers'] });
              break;
          }

          // Show toast for automation updates
          if (showToasts && table === 'automation_logs' && payload.eventType === 'INSERT') {
            const newRecord = payload.new as Record<string, unknown>;
            const source = newRecord.source as string;
            const action = (newRecord.action as string)?.replace(/_/g, ' ');
            const lotNumber = newRecord.lot_number as string;
            const success = newRecord.success as boolean;

            if (source === 'whatsapp' || source === 'email') {
              const icon = source === 'whatsapp' ? '💬' : '📧';
              if (success) {
                toast.success(`${icon} ${lotNumber ? `LOT ${lotNumber}` : 'Update'} via ${source}`, {
                  description: action,
                });
              } else {
                toast.error(`${icon} Failed: ${action}`, {
                  description: `Source: ${source}`,
                });
              }
            }
          }

          // Call custom handler
          onUpdate?.(table, payload);
        }
      );
    });

    channel.subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, tables, onUpdate, showToasts]);
}

// Convenience hook for dashboard realtime updates
export function useDashboardRealtime() {
  useRealtimeSubscription({
    tables: ['shipments', 'shipment_costs', 'automation_logs', 'supplier_ledger', 'payment_schedule'],
    showToasts: true,
  });
}
