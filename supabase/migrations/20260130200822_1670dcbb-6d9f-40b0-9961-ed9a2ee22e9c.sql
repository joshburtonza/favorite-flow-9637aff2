-- Phase 2.5: Advanced Features
-- OCR Document Extraction Queue
CREATE TABLE public.document_extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  source_type TEXT NOT NULL,  -- upload, whatsapp, telegram, email
  source_reference TEXT,
  original_file_path TEXT,
  
  -- Processing
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed, needs_review
  
  -- Extracted data
  extracted_text TEXT,
  extracted_data JSONB DEFAULT '{}',
  confidence_score DECIMAL(5,2),
  
  -- Identified document type
  document_type TEXT,  -- supplier_invoice, packing_list, bill_of_lading, etc.
  
  -- Matched entities
  matched_supplier_id UUID REFERENCES suppliers(id),
  matched_client_id UUID REFERENCES clients(id),
  matched_shipment_id UUID REFERENCES shipments(id),
  
  -- Review
  needs_human_review BOOLEAN DEFAULT false,
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Actions taken
  auto_actions_taken JSONB DEFAULT '[]',
  
  -- Timing
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  error_message TEXT
);

CREATE INDEX idx_extraction_status ON document_extraction_queue(status, created_at);
CREATE INDEX idx_extraction_shipment ON document_extraction_queue(matched_shipment_id);

ALTER TABLE document_extraction_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage extractions" ON document_extraction_queue FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Rollback Checkpoints
CREATE TABLE public.rollback_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  
  -- What was done
  action_type TEXT NOT NULL,  -- create, update, delete, bulk_update
  entity_type TEXT NOT NULL,  -- shipment, supplier, client, etc.
  entity_id UUID,
  entity_ids UUID[],  -- For bulk operations
  
  -- Snapshot for rollback
  previous_state JSONB NOT NULL,
  new_state JSONB,
  
  -- AI context
  ai_conversation_id UUID,
  ai_query TEXT,
  
  -- Status
  is_rolled_back BOOLEAN DEFAULT false,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES auth.users(id),
  
  -- Validity
  can_rollback BOOLEAN DEFAULT true,
  rollback_expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rollback_entity ON rollback_checkpoints(entity_type, entity_id);
CREATE INDEX idx_rollback_user ON rollback_checkpoints(user_id, created_at DESC);
CREATE INDEX idx_rollback_session ON rollback_checkpoints(session_id, created_at DESC);

ALTER TABLE rollback_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own checkpoints" ON rollback_checkpoints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all checkpoints" ON rollback_checkpoints FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "System insert checkpoints" ON rollback_checkpoints FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users rollback own" ON rollback_checkpoints FOR UPDATE
  USING (auth.uid() = user_id);

-- Voice Messages Log
CREATE TABLE public.voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id),
  channel TEXT NOT NULL,
  channel_user_id TEXT,
  
  -- Audio file
  audio_file_path TEXT,
  audio_duration_seconds INTEGER,
  audio_format TEXT,
  
  -- Transcription
  transcription TEXT,
  transcription_confidence DECIMAL(5,2),
  
  -- Processing
  flair_response TEXT,
  tools_used TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_user ON voice_messages(user_id, created_at DESC);
CREATE INDEX idx_voice_channel ON voice_messages(channel, channel_user_id);

ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view voice messages" ON voice_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));