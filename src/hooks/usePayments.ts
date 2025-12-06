import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaymentScheduleEntry, PaymentStatus, CurrencyType } from '@/types/database';
import { toast } from 'sonner';

export function usePayments(status?: PaymentStatus) {
  return useQuery({
    queryKey: ['payments', status],
    queryFn: async () => {
      let query = supabase
        .from('payment_schedule')
        .select(`
          *,
          supplier:suppliers(*),
          shipment:shipments(lot_number),
          bank_account:bank_accounts(*)
        `)
        .order('payment_date', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as PaymentScheduleEntry[];
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      supplier_id: string;
      shipment_id?: string;
      bank_account_id?: string;
      payment_date: string;
      amount_foreign: number;
      currency: CurrencyType;
      fx_rate: number;
      notes?: string;
    }) => {
      const { data: payment, error } = await supabase
        .from('payment_schedule')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to schedule payment');
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PaymentScheduleEntry> & { id: string }) => {
      const { data: payment, error } = await supabase
        .from('payment_schedule')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update payment');
    },
  });
}

export function useMarkPaymentPaid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: payment, error } = await supabase
        .from('payment_schedule')
        .update({ 
          status: 'completed' as PaymentStatus,
          paid_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment marked as paid');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark payment as paid');
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_schedule')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete payment');
    },
  });
}