import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Database column types - formula is handled via options.formula on 'number' type
export type DbColumnType = 'text' | 'number' | 'date' | 'select' | 'multi_select' | 'checkbox' | 'currency' | 'link' | 'email' | 'phone';
// UI column type includes formula for display purposes
export type ColumnType = DbColumnType | 'formula';

export type CurrencyFormat = 'ZAR' | 'USD' | 'EUR' | 'GBP' | 'none';
export type TextAlign = 'left' | 'center' | 'right';
export type FontSize = 'xs' | 'sm' | 'base' | 'lg';

export interface ColumnOptions {
  choices?: string[];
  currency?: CurrencyFormat;
  textAlign?: TextAlign;
  fontSize?: FontSize;
  formula?: string; // e.g., "SUM(A:A)", "AVG(B:B)", "COUNT(C:C)"
  isFormula?: boolean;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

export interface CustomTable {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  group_name?: string;
}

export interface CustomColumn {
  id: string;
  table_id: string;
  name: string;
  column_type: ColumnType;
  options: ColumnOptions;
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

// Formula evaluation helper
export function evaluateFormula(formula: string, rows: CustomRow[], columns: CustomColumn[]): number {
  const match = formula.match(/^(SUM|AVG|COUNT|MIN|MAX)\(([A-Z]):([A-Z])\)$/i);
  if (!match) return 0;
  
  const [, func, startCol] = match;
  const colIndex = startCol.toUpperCase().charCodeAt(0) - 65;
  const column = columns[colIndex];
  
  if (!column) return 0;
  
  const values = rows
    .map(row => parseFloat(row.data[column.id]) || 0)
    .filter(v => !isNaN(v));
  
  switch (func.toUpperCase()) {
    case 'SUM': return values.reduce((a, b) => a + b, 0);
    case 'AVG': return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case 'COUNT': return values.length;
    case 'MIN': return values.length > 0 ? Math.min(...values) : 0;
    case 'MAX': return values.length > 0 ? Math.max(...values) : 0;
    default: return 0;
  }
}

// Generate CSV content as string (for saving to storage)
export function generateCSVContent(columns: CustomColumn[], rows: CustomRow[]): string {
  const headers = columns.map(c => c.name).join(',');
  const csvRows = rows.map(row => 
    columns.map(col => {
      const value = row.data[col.id] ?? '';
      // Escape quotes and wrap in quotes if contains comma
      const strValue = String(value).replace(/"/g, '""');
      return strValue.includes(',') ? `"${strValue}"` : strValue;
    }).join(',')
  );
  
  return [headers, ...csvRows].join('\n');
}

// Export table to CSV (downloads file)
export function exportTableToCSV(columns: CustomColumn[], rows: CustomRow[], tableName: string) {
  const csv = generateCSVContent(columns, rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tableName.replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Parse CSV for import
export function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  
  return { headers, rows };
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
    mutationFn: async (column: { table_id: string; name: string; column_type: ColumnType; options?: ColumnOptions }) => {
      const maxPosition = columns.length > 0 ? Math.max(...columns.map(c => c.order_position)) + 1 : 0;
      // Formula type is stored as 'number' in DB with formula in options
      const dbType: DbColumnType = column.column_type === 'formula' ? 'number' : column.column_type;
      const options = column.column_type === 'formula' 
        ? { ...column.options, isFormula: true }
        : column.options;
      
      const { data, error } = await supabase
        .from('custom_columns')
        .insert([{
          table_id: column.table_id,
          name: column.name,
          column_type: dbType as any,
          options: (options || {}) as any,
          order_position: maxPosition,
        }])
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
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; column_type?: ColumnType; options?: ColumnOptions; width?: number }) => {
      // Handle formula type conversion
      const dbUpdates: any = { ...updates };
      if (updates.column_type === 'formula') {
        dbUpdates.column_type = 'number';
        dbUpdates.options = { ...updates.options, isFormula: true };
      } else if (updates.column_type) {
        dbUpdates.options = { ...updates.options, isFormula: false };
      }
      
      const { error } = await supabase
        .from('custom_columns')
        .update(dbUpdates)
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
