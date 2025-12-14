import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'checkbox' | 'currency' | 'link' | 'email' | 'phone';

export interface CustomTable {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomColumn {
  id: string;
  table_id: string;
  name: string;
  column_type: ColumnType;
  options: Record<string, any>;
  is_required: boolean;
  default_value: string | null;
  order_position: number;
  width: number;
  created_at: string;
}

export interface CustomRow {
  id: string;
  table_id: string;
  data: Record<string, any>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomTables() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['custom-tables'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_tables')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomTable[];
    },
  });

  const createTable = useMutation({
    mutationFn: async (table: { name: string; description?: string; icon?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('custom_tables')
        .insert({
          name: table.name,
          description: table.description || null,
          icon: table.icon || 'table',
          created_by: user.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create default columns
      await supabase.from('custom_columns').insert([
        { table_id: data.id, name: 'Name', column_type: 'text', order_position: 0 },
        { table_id: data.id, name: 'Notes', column_type: 'text', order_position: 1 },
      ]);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-tables'] });
      toast({ title: 'Table created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error creating table', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_tables')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-tables'] });
      toast({ title: 'Table deleted' });
    },
  });

  const updateTable = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; icon?: string }) => {
      const { error } = await supabase
        .from('custom_tables')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-tables'] });
      toast({ title: 'Table updated' });
    },
  });

  return {
    tables,
    isLoading,
    createTable,
    deleteTable,
    updateTable,
  };
}

export function useTableColumns(tableId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: columns = [], isLoading } = useQuery({
    queryKey: ['table-columns', tableId],
    queryFn: async () => {
      if (!tableId) return [];
      const { data, error } = await supabase
        .from('custom_columns')
        .select('*')
        .eq('table_id', tableId)
        .order('order_position');
      
      if (error) throw error;
      return data as CustomColumn[];
    },
    enabled: !!tableId,
  });

  const addColumn = useMutation({
    mutationFn: async (column: { table_id: string; name: string; column_type: ColumnType; options?: Record<string, any> }) => {
      const maxPosition = columns.length > 0 ? Math.max(...columns.map(c => c.order_position)) + 1 : 0;
      const { data, error } = await supabase
        .from('custom_columns')
        .insert({
          ...column,
          order_position: maxPosition,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-columns', tableId] });
      toast({ title: 'Column added' });
    },
  });

  const updateColumn = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; column_type?: ColumnType; options?: Record<string, any>; width?: number }) => {
      const { error } = await supabase
        .from('custom_columns')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-columns', tableId] });
    },
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_columns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-columns', tableId] });
      toast({ title: 'Column deleted' });
    },
  });

  return {
    columns,
    isLoading,
    addColumn,
    updateColumn,
    deleteColumn,
  };
}

export function useTableRows(tableId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['table-rows', tableId],
    queryFn: async () => {
      if (!tableId) return [];
      const { data, error } = await supabase
        .from('custom_rows')
        .select('*')
        .eq('table_id', tableId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomRow[];
    },
    enabled: !!tableId,
  });

  const addRow = useMutation({
    mutationFn: async (data: Record<string, any> = {}) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: newRow, error } = await supabase
        .from('custom_rows')
        .insert({
          table_id: tableId,
          data,
          created_by: user.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-rows', tableId] });
    },
  });

  const updateRow = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const { error } = await supabase
        .from('custom_rows')
        .update({ data })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-rows', tableId] });
    },
  });

  const deleteRow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_rows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-rows', tableId] });
      toast({ title: 'Row deleted' });
    },
  });

  return {
    rows,
    isLoading,
    addRow,
    updateRow,
    deleteRow,
  };
}
