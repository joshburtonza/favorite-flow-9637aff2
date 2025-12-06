import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shipment, ShipmentStatus, ShipmentCosts } from '@/types/database';
import { toast } from 'sonner';

interface ShipmentFilters {
  status?: ShipmentStatus | 'all';
  supplierId?: string;
  clientId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export function useShipments(filters?: ShipmentFilters) {
  return useQuery({
    queryKey: ['shipments', filters],
    queryFn: async () => {
      let query = supabase
        .from('shipments')
        .select(`
          *,
          supplier:suppliers(*),
          client:clients(*),
          costs:shipment_costs(*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.startDate) {
        query = query.gte('eta', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('eta', filters.endDate);
      }
      if (filters?.search) {
        query = query.or(`lot_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to flatten the costs array to a single object
      return (data || []).map(shipment => ({
        ...shipment,
        costs: Array.isArray(shipment.costs) ? shipment.costs[0] : shipment.costs,
      })) as Shipment[];
    },
  });
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          supplier:suppliers(*),
          client:clients(*),
          costs:shipment_costs(*)
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        costs: Array.isArray(data.costs) ? data.costs[0] : data.costs,
      } as Shipment;
    },
    enabled: !!id,
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      lot_number: string;
      supplier_id?: string;
      client_id?: string;
      commodity?: string;
      eta?: string;
      status?: ShipmentStatus;
      notes?: string;
    }) => {
      const { data: shipment, error } = await supabase
        .from('shipments')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create default costs entry
      const { error: costsError } = await supabase
        .from('shipment_costs')
        .insert({ shipment_id: shipment.id });
      
      if (costsError) throw costsError;
      
      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create shipment');
    },
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Shipment> & { id: string }) => {
      const { data: shipment, error } = await supabase
        .from('shipments')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return shipment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.id] });
      toast.success('Shipment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update shipment');
    },
  });
}

export function useUpdateShipmentCosts() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shipmentId, ...data }: Partial<ShipmentCosts> & { shipmentId: string }) => {
      // Check if costs entry exists
      const { data: existingCosts } = await supabase
        .from('shipment_costs')
        .select('id')
        .eq('shipment_id', shipmentId)
        .maybeSingle();
      
      if (existingCosts) {
        const { data: costs, error } = await supabase
          .from('shipment_costs')
          .update(data)
          .eq('shipment_id', shipmentId)
          .select()
          .single();
        
        if (error) throw error;
        return costs;
      } else {
        const { data: costs, error } = await supabase
          .from('shipment_costs')
          .insert({ shipment_id: shipmentId, ...data })
          .select()
          .single();
        
        if (error) throw error;
        return costs;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment'] });
      toast.success('Costs updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update costs');
    },
  });
}

export function useDeleteShipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete shipment');
    },
  });
}