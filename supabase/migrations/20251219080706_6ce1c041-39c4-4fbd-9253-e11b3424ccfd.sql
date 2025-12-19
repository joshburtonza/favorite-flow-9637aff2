-- Create enum for file costing status
CREATE TYPE file_costing_status AS ENUM ('draft', 'pending_review', 'finalized');

-- Create file_costings table
CREATE TABLE public.file_costings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  lot_number TEXT,
  
  -- Attached documents (array of document IDs)
  transport_documents JSONB DEFAULT '[]',
  clearing_documents JSONB DEFAULT '[]',
  other_documents JSONB DEFAULT '[]',
  
  -- Cost breakdown
  transport_cost_zar NUMERIC DEFAULT 0,
  clearing_cost_zar NUMERIC DEFAULT 0,
  other_costs_zar NUMERIC DEFAULT 0,
  grand_total_zar NUMERIC DEFAULT 0,
  
  -- Metadata
  status file_costing_status DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_costings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view file_costings"
ON public.file_costings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert file_costings"
ON public.file_costings FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update file_costings"
ON public.file_costings FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete file_costings"
ON public.file_costings FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_file_costings_updated_at
BEFORE UPDATE ON public.file_costings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();