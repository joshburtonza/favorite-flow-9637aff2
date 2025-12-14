-- Event Logs table for comprehensive event tracking
CREATE TABLE IF NOT EXISTS public.ai_event_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID,
  user_email TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- State tracking
  before_state JSONB,
  after_state JSONB,
  changes JSONB,
  
  -- Context and relationships
  related_entities JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- AI extracted info
  ai_classification TEXT,
  ai_extracted_data JSONB,
  ai_confidence NUMERIC(3,2),
  ai_summary TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_ai_event_logs_entity ON public.ai_event_logs(entity_type, entity_id);
CREATE INDEX idx_ai_event_logs_timestamp ON public.ai_event_logs(timestamp DESC);
CREATE INDEX idx_ai_event_logs_user ON public.ai_event_logs(user_id);
CREATE INDEX idx_ai_event_logs_event_type ON public.ai_event_logs(event_type);

-- Enable RLS
ALTER TABLE public.ai_event_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view event logs"
  ON public.ai_event_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert event logs"
  ON public.ai_event_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete event logs"
  ON public.ai_event_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- AI Job Queue for background processing
CREATE TABLE IF NOT EXISTS public.ai_job_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  result JSONB,
  error TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ
);

-- Create indexes for job queue
CREATE INDEX idx_ai_job_queue_status ON public.ai_job_queue(status);
CREATE INDEX idx_ai_job_queue_priority ON public.ai_job_queue(priority DESC, created_at);

-- Enable RLS
ALTER TABLE public.ai_job_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for job queue
CREATE POLICY "Authenticated users can view job queue"
  ON public.ai_job_queue FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage job queue"
  ON public.ai_job_queue FOR ALL
  USING (true);

-- Add AI columns to uploaded_documents if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploaded_documents' AND column_name = 'ai_classification') THEN
    ALTER TABLE public.uploaded_documents ADD COLUMN ai_classification TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploaded_documents' AND column_name = 'ai_confidence') THEN
    ALTER TABLE public.uploaded_documents ADD COLUMN ai_confidence NUMERIC(3,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploaded_documents' AND column_name = 'requires_manual_linking') THEN
    ALTER TABLE public.uploaded_documents ADD COLUMN requires_manual_linking BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploaded_documents' AND column_name = 'auto_linked') THEN
    ALTER TABLE public.uploaded_documents ADD COLUMN auto_linked BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploaded_documents' AND column_name = 'shipment_id') THEN
    ALTER TABLE public.uploaded_documents ADD COLUMN shipment_id UUID REFERENCES public.shipments(id);
  END IF;
END $$;

-- Add AI summary to shipments if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'ai_summary') THEN
    ALTER TABLE public.shipments ADD COLUMN ai_summary TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shipments' AND column_name = 'last_updated_by') THEN
    ALTER TABLE public.shipments ADD COLUMN last_updated_by TEXT;
  END IF;
END $$;

-- Create function to log shipment changes
CREATE OR REPLACE FUNCTION public.log_shipment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changes_json JSONB;
  event_type_val TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type_val := 'shipment_created';
    changes_json := to_jsonb(NEW);
    
    INSERT INTO public.ai_event_logs (
      event_type, entity_type, entity_id, after_state, changes,
      related_entities, metadata
    ) VALUES (
      event_type_val, 'shipment', NEW.id, to_jsonb(NEW), changes_json,
      jsonb_build_object('supplier_id', NEW.supplier_id, 'client_id', NEW.client_id),
      jsonb_build_object('lot_number', NEW.lot_number)
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      event_type_val := 'shipment_status_changed';
    ELSE
      event_type_val := 'shipment_updated';
    END IF;
    
    -- Build changes JSON
    changes_json := jsonb_build_object(
      'lot_number', CASE WHEN OLD.lot_number IS DISTINCT FROM NEW.lot_number THEN jsonb_build_object('old', OLD.lot_number, 'new', NEW.lot_number) ELSE NULL END,
      'status', CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN jsonb_build_object('old', OLD.status, 'new', NEW.status) ELSE NULL END,
      'eta', CASE WHEN OLD.eta IS DISTINCT FROM NEW.eta THEN jsonb_build_object('old', OLD.eta, 'new', NEW.eta) ELSE NULL END,
      'commodity', CASE WHEN OLD.commodity IS DISTINCT FROM NEW.commodity THEN jsonb_build_object('old', OLD.commodity, 'new', NEW.commodity) ELSE NULL END
    );
    
    -- Remove null entries
    changes_json := (SELECT jsonb_object_agg(key, value) FROM jsonb_each(changes_json) WHERE value IS NOT NULL);
    
    INSERT INTO public.ai_event_logs (
      event_type, entity_type, entity_id, before_state, after_state, changes,
      related_entities, metadata
    ) VALUES (
      event_type_val, 'shipment', NEW.id, to_jsonb(OLD), to_jsonb(NEW), changes_json,
      jsonb_build_object('supplier_id', NEW.supplier_id, 'client_id', NEW.client_id),
      jsonb_build_object('lot_number', NEW.lot_number, 'updated_by', NEW.last_updated_by)
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.ai_event_logs (
      event_type, entity_type, entity_id, before_state,
      metadata
    ) VALUES (
      'shipment_deleted', 'shipment', OLD.id, to_jsonb(OLD),
      jsonb_build_object('lot_number', OLD.lot_number)
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for shipment changes
DROP TRIGGER IF EXISTS trigger_log_shipment_changes ON public.shipments;
CREATE TRIGGER trigger_log_shipment_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.log_shipment_changes();

-- Create function to log document uploads
CREATE OR REPLACE FUNCTION public.log_document_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ai_event_logs (
      event_type, entity_type, entity_id, after_state,
      ai_classification, ai_extracted_data, ai_confidence,
      related_entities, metadata
    ) VALUES (
      'document_uploaded', 'document', NEW.id, to_jsonb(NEW),
      NEW.ai_classification, NEW.extracted_data, NEW.ai_confidence,
      jsonb_build_object('folder_id', NEW.folder_id, 'shipment_id', NEW.shipment_id),
      jsonb_build_object('file_name', NEW.file_name, 'lot_number', NEW.lot_number)
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if AI classification completed
    IF OLD.ai_classification IS DISTINCT FROM NEW.ai_classification AND NEW.ai_classification IS NOT NULL THEN
      INSERT INTO public.ai_event_logs (
        event_type, entity_type, entity_id, before_state, after_state,
        ai_classification, ai_extracted_data, ai_confidence,
        metadata
      ) VALUES (
        'ai_extraction_completed', 'document', NEW.id, to_jsonb(OLD), to_jsonb(NEW),
        NEW.ai_classification, NEW.extracted_data, NEW.ai_confidence,
        jsonb_build_object('file_name', NEW.file_name, 'lot_number', NEW.lot_number)
      );
    END IF;
    
    -- Check if document was linked to shipment
    IF OLD.shipment_id IS DISTINCT FROM NEW.shipment_id AND NEW.shipment_id IS NOT NULL THEN
      INSERT INTO public.ai_event_logs (
        event_type, entity_type, entity_id,
        related_entities, metadata
      ) VALUES (
        'relationship_created', 'document', NEW.id,
        jsonb_build_object('shipment_id', NEW.shipment_id),
        jsonb_build_object('file_name', NEW.file_name, 'auto_linked', NEW.auto_linked)
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for document changes
DROP TRIGGER IF EXISTS trigger_log_document_changes ON public.uploaded_documents;
CREATE TRIGGER trigger_log_document_changes
  AFTER INSERT OR UPDATE ON public.uploaded_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_document_changes();

-- Enable realtime for event logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_event_logs;