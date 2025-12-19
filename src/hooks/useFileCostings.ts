import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export type FileCostingStatus = 'draft' | 'pending_review' | 'finalized';

export interface FileCosting {
  id: string;
  shipment_id: string | null;
  lot_number: string | null;
  transport_documents: string[];
  clearing_documents: string[];
  other_documents: string[];
  transport_cost_zar: number;
  clearing_cost_zar: number;
  other_costs_zar: number;
  grand_total_zar: number;
  status: FileCostingStatus;
  notes: string | null;
  created_by: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileCostingInsert {
  shipment_id?: string | null;
  lot_number?: string | null;
  transport_documents?: string[];
  clearing_documents?: string[];
  other_documents?: string[];
  transport_cost_zar?: number;
  clearing_cost_zar?: number;
  other_costs_zar?: number;
  grand_total_zar?: number;
  status?: FileCostingStatus;
  notes?: string | null;
  created_by?: string | null;
}

export interface FileCostingUpdate extends Partial<FileCostingInsert> {
  id: string;
  finalized_at?: string | null;
  finalized_by?: string | null;
}

interface ShipmentForCosting {
  id: string;
  lot_number: string;
  supplier_name: string | null;
  client_name: string | null;
  status: string;
  document_count: number;
}

// Transform database row to our interface
function transformCosting(row: Record<string, unknown>): FileCosting {
  return {
    id: row.id as string,
    shipment_id: row.shipment_id as string | null,
    lot_number: row.lot_number as string | null,
    transport_documents: (row.transport_documents as string[]) || [],
    clearing_documents: (row.clearing_documents as string[]) || [],
    other_documents: (row.other_documents as string[]) || [],
    transport_cost_zar: Number(row.transport_cost_zar) || 0,
    clearing_cost_zar: Number(row.clearing_cost_zar) || 0,
    other_costs_zar: Number(row.other_costs_zar) || 0,
    grand_total_zar: Number(row.grand_total_zar) || 0,
    status: row.status as FileCostingStatus,
    notes: row.notes as string | null,
    created_by: row.created_by as string | null,
    finalized_at: row.finalized_at as string | null,
    finalized_by: row.finalized_by as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function useFileCostings(status?: FileCostingStatus) {
  return useQuery({
    queryKey: ['file-costings', status],
    queryFn: async () => {
      let query = supabase
        .from('file_costings')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(transformCosting);
    },
  });
}

export function useFileCosting(id: string | undefined) {
  return useQuery({
    queryKey: ['file-costing', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('file_costings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return transformCosting(data);
    },
    enabled: !!id,
  });
}

export function useShipmentsReadyForCosting() {
  return useQuery({
    queryKey: ['shipments-ready-for-costing'],
    queryFn: async () => {
      // Get shipments that have documents but no costing yet
      const { data: shipments, error: shipmentsError } = await supabase
        .from('v_shipments_full')
        .select('id, lot_number, supplier_name, client_name, status')
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      // Get existing costings
      const { data: costings, error: costingsError } = await supabase
        .from('file_costings')
        .select('shipment_id');

      if (costingsError) throw costingsError;

      const costedShipmentIds = new Set((costings || []).map(c => c.shipment_id));

      // Get document counts per shipment
      const { data: documents, error: docsError } = await supabase
        .from('uploaded_documents')
        .select('shipment_id')
        .not('shipment_id', 'is', null);

      if (docsError) throw docsError;

      const docCounts: Record<string, number> = {};
      (documents || []).forEach(doc => {
        if (doc.shipment_id) {
          docCounts[doc.shipment_id] = (docCounts[doc.shipment_id] || 0) + 1;
        }
      });

      // Filter to shipments with documents but no costing
      const result: ShipmentForCosting[] = (shipments || [])
        .filter(s => s.id && !costedShipmentIds.has(s.id) && docCounts[s.id])
        .map(s => ({
          id: s.id!,
          lot_number: s.lot_number || '',
          supplier_name: s.supplier_name,
          client_name: s.client_name,
          status: s.status || 'pending',
          document_count: docCounts[s.id!] || 0,
        }));

      return result;
    },
  });
}

export function useShipmentDocuments(shipmentId: string | undefined) {
  return useQuery({
    queryKey: ['shipment-documents', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return { transport: [], clearing: [], other: [] };

      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('id, file_name, document_type, ai_classification')
        .eq('shipment_id', shipmentId);

      if (error) throw error;

      const transport = (data || []).filter(d => 
        d.document_type === 'transport_invoice' || 
        d.ai_classification === 'transport_invoice'
      );
      const clearing = (data || []).filter(d => 
        d.document_type === 'clearing_invoice' || 
        d.ai_classification === 'clearing_invoice'
      );
      const other = (data || []).filter(d => 
        !['transport_invoice', 'clearing_invoice'].includes(d.document_type || '') &&
        !['transport_invoice', 'clearing_invoice'].includes(d.ai_classification || '')
      );

      return { transport, clearing, other };
    },
    enabled: !!shipmentId,
  });
}

export function useCreateFileCosting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (costing: FileCostingInsert) => {
      const { data: user } = await supabase.auth.getUser();
      
      const insertData = {
        ...costing,
        transport_documents: costing.transport_documents as unknown as Json,
        clearing_documents: costing.clearing_documents as unknown as Json,
        other_documents: costing.other_documents as unknown as Json,
        created_by: user.user?.id,
      };

      const { data, error } = await supabase
        .from('file_costings')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return transformCosting(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-costings'] });
      queryClient.invalidateQueries({ queryKey: ['shipments-ready-for-costing'] });
      toast({ title: 'File costing created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create file costing', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFileCosting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FileCostingUpdate) => {
      const updateData = {
        ...updates,
        transport_documents: updates.transport_documents as unknown as Json,
        clearing_documents: updates.clearing_documents as unknown as Json,
        other_documents: updates.other_documents as unknown as Json,
      };

      const { data, error } = await supabase
        .from('file_costings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformCosting(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-costings'] });
      toast({ title: 'File costing updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update file costing', description: error.message, variant: 'destructive' });
    },
  });
}

export function useFinalizeFileCosting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('file_costings')
        .update({
          status: 'finalized' as FileCostingStatus,
          finalized_at: new Date().toISOString(),
          finalized_by: user.user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformCosting(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-costings'] });
      toast({ title: 'File costing finalized successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to finalize file costing', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFileCosting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('file_costings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-costings'] });
      queryClient.invalidateQueries({ queryKey: ['shipments-ready-for-costing'] });
      toast({ title: 'File costing deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete file costing', description: error.message, variant: 'destructive' });
    },
  });
}
