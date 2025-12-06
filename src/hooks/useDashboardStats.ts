import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, format } from 'date-fns';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date();
      const nextWeek = addDays(today, 7);
      
      // Active shipments count
      const { count: activeShipments } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'completed');
      
      // Total value in transit
      const { data: inTransitCosts } = await supabase
        .from('shipments')
        .select(`
          costs:shipment_costs(client_invoice_zar)
        `)
        .neq('status', 'completed');
      
      const totalValueInTransit = inTransitCosts?.reduce((sum, s) => {
        const costs = Array.isArray(s.costs) ? s.costs[0] : s.costs;
        return sum + (costs?.client_invoice_zar || 0);
      }, 0) || 0;
      
      // Documents pending
      const { count: documentsPending } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .eq('document_submitted', false)
        .neq('status', 'completed');
      
      // Deliveries this week
      const { count: deliveriesThisWeek } = await supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .gte('delivery_date', format(today, 'yyyy-MM-dd'))
        .lte('delivery_date', format(nextWeek, 'yyyy-MM-dd'));
      
      return {
        activeShipments: activeShipments || 0,
        totalValueInTransit,
        documentsPending: documentsPending || 0,
        deliveriesThisWeek: deliveriesThisWeek || 0,
      };
    },
  });
}