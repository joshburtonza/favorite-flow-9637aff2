-- Document Templates table for storing format rules and templates
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('file_costing', 'client_invoice', 'supplier_invoice', 'packing_list', 'statement')),
  
  -- Template storage
  template_file_path TEXT,
  template_data JSONB DEFAULT '{}',
  
  -- Formatting rules
  format_rules JSONB DEFAULT '{}',
  
  -- Field mappings (DB fields to template cells)
  field_mappings JSONB DEFAULT '{}',
  
  -- Styling
  color_scheme JSONB DEFAULT '{}',
  fonts JSONB DEFAULT '{}',
  
  -- Metadata
  version INTEGER DEFAULT 1,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON document_templates(document_type, is_active);
CREATE INDEX IF NOT EXISTS idx_templates_default ON document_templates(document_type, is_default) WHERE is_default = true;

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins manage templates" ON document_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view templates
CREATE POLICY "Users view templates" ON document_templates FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Add format metadata columns to uploaded_documents if not exists
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS format_metadata JSONB DEFAULT '{}';
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES document_templates(id);
ALTER TABLE uploaded_documents ADD COLUMN IF NOT EXISTS parsed_structure JSONB DEFAULT '{}';

-- Insert default file costing template
INSERT INTO document_templates (name, document_type, is_default, is_active, format_rules, color_scheme, field_mappings)
VALUES (
  'Standard File Costing',
  'file_costing',
  true,
  true,
  '{
    "header": {
      "row": 1,
      "pattern": "LOT {lot_number} - {supplier_name} - DOC {client_name}",
      "style": { "bold": true, "fontSize": 14 }
    },
    "sections": [
      {
        "name": "fob_costs",
        "startRow": 5,
        "items": ["FOB", "TOTAL"],
        "totalRow": 7
      },
      {
        "name": "exchange_rates",
        "startRow": 9,
        "items": ["ROE - OURS", "ROE - CLIENT"],
        "highlightRow": "ROE - CLIENT",
        "highlightColor": "FFFF00"
      },
      {
        "name": "clearing_costs",
        "startRow": 14,
        "items": ["CUSTOMS DUTY", "CUSTOMS VAT", "CONTAINER LANDING", "CARGO DUES", "AGENCY"]
      },
      {
        "name": "transport",
        "startRow": 23
      },
      {
        "name": "bank",
        "startRow": 26
      },
      {
        "name": "totals",
        "startRow": 30
      }
    ]
  }'::jsonb,
  '{
    "header": "FF4472C4",
    "highlight": "FFFFFF00",
    "profit": "FF90EE90",
    "total": "FFE0E0E0"
  }'::jsonb,
  '{
    "lot_number": "A1",
    "supplier_name": "A1",
    "client_name": "A1",
    "fob_amount": "B5",
    "roe_ours": "B9",
    "roe_client": "B10",
    "customs_duty": "B16",
    "customs_vat": "B17",
    "container_landing": "B18",
    "cargo_dues": "B19",
    "agency_fee": "B20",
    "transport_cost": "B23",
    "bank_charges": "B26",
    "fx_commission": "B27",
    "total_cost": "B30",
    "client_invoice": "B31",
    "profit": "B32"
  }'::jsonb
);

-- Insert default client invoice template
INSERT INTO document_templates (name, document_type, is_default, is_active, format_rules, color_scheme)
VALUES (
  'Standard Client Invoice',
  'client_invoice',
  true,
  true,
  '{
    "header": {
      "companyName": true,
      "logo": true,
      "invoiceNumber": true,
      "date": true
    },
    "sections": ["client_details", "line_items", "totals", "bank_details", "notes"]
  }'::jsonb,
  '{
    "header": "FF4472C4",
    "accent": "FF10B981"
  }'::jsonb
);