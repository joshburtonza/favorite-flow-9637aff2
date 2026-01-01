import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface ClientInvoice {
  id: string;
  invoice_number: string;
  client_id: string | null;
  shipment_id: string | null;
  amount_zar: number;
  vat_amount: number | null;
  total_amount: number | null;
  line_items: LineItem[];
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  lot_number: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  supplier_name?: string;
}

export interface CreateInvoiceData {
  client_id: string;
  shipment_id?: string;
  amount_zar: number;
  vat_amount?: number;
  line_items?: LineItem[];
  invoice_date?: string;
  due_date?: string;
  notes?: string;
  lot_number?: string;
}

export function useClientInvoices() {
  return useQuery({
    queryKey: ['client-invoices'],
    queryFn: async () => {
      // First get invoices
      const { data: invoices, error } = await supabase
        .from('client_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get client and shipment names
      const clientIds = [...new Set(invoices?.filter(i => i.client_id).map(i => i.client_id) || [])];
      const shipmentIds = [...new Set(invoices?.filter(i => i.shipment_id).map(i => i.shipment_id) || [])];

      let clients: Record<string, string> = {};
      let shipments: Record<string, { lot_number: string; supplier_name: string | null }> = {};

      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name')
          .in('id', clientIds);
        clients = Object.fromEntries(clientData?.map(c => [c.id, c.name]) || []);
      }

      if (shipmentIds.length > 0) {
        const { data: shipmentData } = await supabase
          .from('v_shipments_full')
          .select('id, lot_number, supplier_name')
          .in('id', shipmentIds);
        shipments = Object.fromEntries(
          shipmentData?.map(s => [s.id, { lot_number: s.lot_number, supplier_name: s.supplier_name }]) || []
        );
      }

      return invoices?.map(inv => ({
        ...inv,
        line_items: (Array.isArray(inv.line_items) ? inv.line_items : []) as unknown as LineItem[],
        status: inv.status as InvoiceStatus,
        client_name: inv.client_id ? clients[inv.client_id] : undefined,
        supplier_name: inv.shipment_id ? shipments[inv.shipment_id]?.supplier_name : undefined,
      })) as ClientInvoice[];
    },
  });
}

export function useClientInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['client-invoice', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('client_invoices')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get client name
      let client_name: string | undefined;
      if (data.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', data.client_id)
          .maybeSingle();
        client_name = clientData?.name;
      }

      return {
        ...data,
        line_items: (Array.isArray(data.line_items) ? data.line_items : []) as unknown as LineItem[],
        status: data.status as InvoiceStatus,
        client_name,
      } as ClientInvoice;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateInvoiceData) => {
      // Generate invoice number
      const { data: invoiceNum, error: numError } = await supabase
        .rpc('generate_invoice_number');
      
      if (numError) throw numError;

      const insertData = {
        invoice_number: invoiceNum as string,
        client_id: data.client_id,
        shipment_id: data.shipment_id || null,
        amount_zar: data.amount_zar,
        vat_amount: data.vat_amount || 0,
        line_items: JSON.stringify(data.line_items || []),
        invoice_date: data.invoice_date || new Date().toISOString().split('T')[0],
        due_date: data.due_date || null,
        notes: data.notes || null,
        lot_number: data.lot_number || null,
        created_by: user?.id || null,
        status: 'draft' as const,
      };

      const { data: invoice, error } = await supabase
        .from('client_invoices')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      toast.success('Invoice created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create invoice: ' + error.message);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateInvoiceData> & { id: string }) => {
      const updates: Record<string, unknown> = {};
      if (data.client_id !== undefined) updates.client_id = data.client_id;
      if (data.shipment_id !== undefined) updates.shipment_id = data.shipment_id || null;
      if (data.amount_zar !== undefined) updates.amount_zar = data.amount_zar;
      if (data.vat_amount !== undefined) updates.vat_amount = data.vat_amount;
      if (data.line_items !== undefined) updates.line_items = JSON.stringify(data.line_items);
      if (data.invoice_date !== undefined) updates.invoice_date = data.invoice_date;
      if (data.due_date !== undefined) updates.due_date = data.due_date || null;
      if (data.notes !== undefined) updates.notes = data.notes || null;
      if (data.lot_number !== undefined) updates.lot_number = data.lot_number || null;

      const { error } = await supabase
        .from('client_invoices')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      toast.success('Invoice updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update invoice: ' + error.message);
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, paid_date }: { id: string; status: InvoiceStatus; paid_date?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'paid' && paid_date) {
        updates.paid_date = paid_date;
      }

      const { error } = await supabase
        .from('client_invoices')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      toast.success('Invoice status updated');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });
}

export function useShipmentsReadyForInvoicing() {
  return useQuery({
    queryKey: ['shipments-ready-for-invoicing'],
    queryFn: async () => {
      // Get shipments that have costs but no client invoice yet
      const { data: shipments, error } = await supabase
        .from('v_shipments_full')
        .select('*')
        .gt('client_invoice_zar', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get existing invoiced shipment IDs
      const { data: invoices } = await supabase
        .from('client_invoices')
        .select('shipment_id')
        .not('shipment_id', 'is', null);

      const invoicedShipmentIds = new Set(invoices?.map(i => i.shipment_id) || []);

      // Filter out already invoiced shipments
      return shipments?.filter(s => s.id && !invoicedShipmentIds.has(s.id)) || [];
    },
  });
}
