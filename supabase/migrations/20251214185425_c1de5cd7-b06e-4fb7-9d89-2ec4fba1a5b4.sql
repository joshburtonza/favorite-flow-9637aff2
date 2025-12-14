-- Create workflow status enum
CREATE TYPE public.workflow_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');

-- Add workflow fields to uploaded_documents
ALTER TABLE public.uploaded_documents 
ADD COLUMN IF NOT EXISTS workflow_status public.workflow_status DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS workflow_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejected_by uuid,
ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS original_folder text,
ADD COLUMN IF NOT EXISTS destination_folder text,
ADD COLUMN IF NOT EXISTS auto_route_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS uploaded_by uuid,
ADD COLUMN IF NOT EXISTS file_hash text,
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_document uuid,
ADD COLUMN IF NOT EXISTS is_latest_version boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS replaced_by uuid,
ADD COLUMN IF NOT EXISTS user_corrected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS corrected_fields text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS requires_user_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_manual_entry boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_applied boolean DEFAULT false;

-- Create extraction corrections table for learning
CREATE TABLE IF NOT EXISTS public.extraction_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  ai_extracted_value text,
  user_corrected_value text,
  corrected_by uuid,
  corrected_at timestamptz DEFAULT now(),
  document_type text,
  correction_context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create extraction stats table for accuracy tracking
CREATE TABLE IF NOT EXISTS public.extraction_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  field_name text NOT NULL,
  total_extractions integer DEFAULT 0,
  corrections_count integer DEFAULT 0,
  accuracy_rate numeric DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(document_type, field_name)
);

-- Create duplicate detection settings table
CREATE TABLE IF NOT EXISTS public.duplicate_detection_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duplicate_detection_enabled boolean DEFAULT true,
  filename_similarity_threshold numeric DEFAULT 0.85,
  auto_block_exact_duplicates boolean DEFAULT false,
  check_invoice_numbers boolean DEFAULT true,
  duplicate_check_days integer DEFAULT 90,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default duplicate detection settings
INSERT INTO public.duplicate_detection_settings (duplicate_detection_enabled)
VALUES (true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.extraction_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_detection_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for extraction_corrections
CREATE POLICY "Authenticated users can view corrections"
ON public.extraction_corrections FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert corrections"
ON public.extraction_corrections FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for extraction_stats
CREATE POLICY "Authenticated users can view stats"
ON public.extraction_stats FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage stats"
ON public.extraction_stats FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for duplicate_detection_settings
CREATE POLICY "Authenticated users can view settings"
ON public.duplicate_detection_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage settings"
ON public.duplicate_detection_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create index for file hash lookups
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON public.uploaded_documents(file_hash);

-- Create index for workflow status
CREATE INDEX IF NOT EXISTS idx_documents_workflow_status ON public.uploaded_documents(workflow_status);