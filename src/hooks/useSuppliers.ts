import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Supplier, SupplierLedgerEntry, LedgerType } from '@/types/database';
import { toast } from 'sonner';
import { useActivityLogger } from './useActivityLogger';

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
  const { logCreate } = useActivityLogger();
  
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
    onSuccess: (supplier, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      logCreate('supplier', supplier.id, supplier.name, variables);
      toast.success('Supplier created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create supplier');
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const { logUpdate } = useActivityLogger();
  
  return useMutation({
    mutationFn: async ({ id, oldData, ...data }: Partial<Supplier> & { id: string; oldData?: Partial<Supplier> }) => {
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { supplier, oldData, newData: data };
    },
    onSuccess: ({ supplier, oldData, newData }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['supplier', variables.id] });
      logUpdate('supplier', supplier.id, supplier.name, oldData, newData);
      toast.success('Supplier updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update supplier');
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const { logDelete } = useActivityLogger();
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, name };
    },
    onSuccess: ({ id, name }) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      logDelete('supplier', id, name || 'Supplier');
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
  const { logCreate } = useActivityLogger();
  
  return useMutation({
    mutationFn: async (data: {
      supplier_id: string;
      supplier_name?: string;
      shipment_id?: string;
      transaction_date: string;
      invoice_number?: string;
      description?: string;
      ledger_type: LedgerType;
      amount: number;
      notes?: string;
    }) => {
      const { supplier_name, ...insertData } = data;
      const { data: entry, error } = await supabase
        .from('supplier_ledger')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return { entry, supplier_name };
    },
    onSuccess: ({ entry, supplier_name }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', variables.supplier_id] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      logCreate('payment', entry.id, `${variables.ledger_type} - ${supplier_name || 'Supplier'}`, {
        amount: variables.amount,
        type: variables.ledger_type,
      });
      toast.success('Ledger entry added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add ledger entry');
    },
  });
}
