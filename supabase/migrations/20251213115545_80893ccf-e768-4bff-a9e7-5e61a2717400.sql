-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to view documents
CREATE POLICY "Authenticated users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete their uploaded documents
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Create a table to track document metadata for AI retrieval
CREATE TABLE public.uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  document_type TEXT, -- invoice, bol, payment, etc.
  lot_number TEXT,
  supplier_name TEXT,
  client_name TEXT,
  summary TEXT,
  extracted_data JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can view uploaded_documents"
ON public.uploaded_documents FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert uploaded_documents"
ON public.uploaded_documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update uploaded_documents"
ON public.uploaded_documents FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete uploaded_documents"
ON public.uploaded_documents FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_uploaded_documents_updated_at
BEFORE UPDATE ON public.uploaded_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();