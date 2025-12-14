-- Add document-specific permissions to the app_permission enum
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'view_supplier_invoices';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'view_packing_lists';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'view_shipping_documents';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'view_transport_invoices';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'view_clearing_invoices';
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'download_documents';

-- Create a table to store staff-specific document access
CREATE TABLE IF NOT EXISTS public.staff_document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, document_type)
);

-- Enable RLS
ALTER TABLE public.staff_document_access ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage document access"
  ON public.staff_document_access
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own access"
  ON public.staff_document_access
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_document_access;