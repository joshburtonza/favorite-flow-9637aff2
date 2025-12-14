import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types/database';
import { toast } from 'sonner';
import { useActivityLogger } from './useActivityLogger';

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { logCreate } = useActivityLogger();
  
  return useMutation({
    mutationFn: async (data: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: client, error } = await supabase
        .from('clients')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return client;
    },
    onSuccess: (client, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      logCreate('client', client.id, client.name, variables);
      toast.success('Client created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create client');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { logUpdate } = useActivityLogger();
  
  return useMutation({
    mutationFn: async ({ id, oldData, ...data }: Partial<Client> & { id: string; oldData?: Partial<Client> }) => {
      const { data: client, error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { client, oldData, newData: data };
    },
    onSuccess: ({ client, oldData, newData }, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
      logUpdate('client', client.id, client.name, oldData, newData);
      toast.success('Client updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update client');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { logDelete } = useActivityLogger();
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name?: string }) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { id, name };
    },
    onSuccess: ({ id, name }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      logDelete('client', id, name || 'Client');
      toast.success('Client deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete client');
    },
  });
}
