-- Create invoice status enum
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');

-- Create client_invoices table
CREATE TABLE public.client_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  
  -- Financial details
  amount_zar NUMERIC(15, 2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) GENERATED ALWAYS AS (amount_zar + COALESCE(vat_amount, 0)) STORED,
  
  -- Line items stored as JSONB for flexibility
  line_items JSONB DEFAULT '[]'::jsonb,
  
  -- Status tracking
  status invoice_status NOT NULL DEFAULT 'draft',
  
  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_date DATE,
  
  -- Notes and references
  notes TEXT,
  lot_number TEXT,
  
  -- Audit fields
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view invoices"
  ON public.client_invoices
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert invoices"
  ON public.client_invoices
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update invoices"
  ON public.client_invoices
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete invoices"
  ON public.client_invoices
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_client_invoices_updated_at
  BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for common queries
CREATE INDEX idx_client_invoices_client ON public.client_invoices(client_id);
CREATE INDEX idx_client_invoices_shipment ON public.client_invoices(shipment_id);
CREATE INDEX idx_client_invoices_status ON public.client_invoices(status);
CREATE INDEX idx_client_invoices_date ON public.client_invoices(invoice_date DESC);

-- Add sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1001;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_part TEXT;
  seq_part TEXT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YYYY');
  seq_part := lpad(nextval('invoice_number_seq')::text, 5, '0');
  RETURN 'INV-' || year_part || '-' || seq_part;
END;
$$;