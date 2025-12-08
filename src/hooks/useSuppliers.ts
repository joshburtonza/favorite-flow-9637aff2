import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Supplier, SupplierLedgerEntry, LedgerType } from '@/types/database';
import { toast } from 'sonner';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Supplier | null;
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'current_balance'>) => {
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create supplier');
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Supplier> & { id: string }) => {
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return supplier;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
      toast.success('Supplier updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update supplier');
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete supplier');
    },
  });
}

export function useSupplierLedger(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-ledger', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_ledger')
        .select(`
          *,
          shipment:shipments(lot_number)
        `)
        .eq('supplier_id', supplierId)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as SupplierLedgerEntry[];
    },
    enabled: !!supplierId,
  });
}

export function useCreateLedgerEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      supplier_id: string;
      shipment_id?: string;
      transaction_date: string;
      invoice_number?: string;
      description?: string;
      ledger_type: LedgerType;
      amount: number;
      notes?: string;
    }) => {
      const { data: entry, error } = await supabase
        .from('supplier_ledger')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return entry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', variables.supplier_id] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Ledger entry added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add ledger entry');
    },
  });
}