-- Document Type Definitions with vendor-specific patterns and extraction rules
CREATE TABLE IF NOT EXISTS public.document_type_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  recognition_patterns JSONB NOT NULL DEFAULT '{}',
  extraction_rules JSONB NOT NULL DEFAULT '{}',
  field_mapping JSONB NOT NULL DEFAULT '{}',
  vendor_name TEXT,
  vendor_id UUID REFERENCES suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_type_defs_type ON document_type_definitions(document_type, is_active);
CREATE INDEX IF NOT EXISTS idx_doc_type_defs_vendor ON document_type_definitions(vendor_name);

-- Enable RLS
ALTER TABLE document_type_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view document types" ON document_type_definitions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage document types" ON document_type_definitions
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Pre-populate with known vendor document types

-- Nunso-Fast Clearing Agent Invoice
INSERT INTO document_type_definitions (document_type, display_name, recognition_patterns, extraction_rules, field_mapping, vendor_name) VALUES
('clearing_agent_nunsofast', 'Nunso-Fast Clearing Invoice', 
'{
  "text_patterns": ["Nunso-Fast Logistics", "Tax Invoice", "CUSTOMS DUTY", "CONTAINER LANDING"],
  "identifier_pattern": "IN\\d{6}",
  "color_hints": ["pink", "salmon"]
}'::jsonb,
'{
  "invoice_number": {"pattern": "IN(\\d{6})", "type": "string"},
  "invoice_date": {"pattern": "Date\\s+(\\d{2}/\\d{2}/\\d{4})", "type": "date"},
  "vessel": {"pattern": "VESSEL:\\s*(\\w+)", "type": "string"},
  "voyage": {"pattern": "VOY:\\s*([\\w\\s]+)", "type": "string"},
  "container_number": {"pattern": "C/NO:\\s*(\\w+)", "type": "string"},
  "reference": {"pattern": "Your Reference\\s+(\\d+)", "type": "string"},
  "customs_duty": {"pattern": "CUSTOMS DUTY.*?([\\d,]+\\.\\d{2})", "type": "currency"},
  "customs_vat": {"pattern": "CUSTOMS VAT.*?([\\d,]+\\.\\d{2})", "type": "currency"},
  "container_landing": {"pattern": "CONTAINER LANDING.*?([\\d,]+\\.\\d{2})", "type": "currency"},
  "agency_fee": {"pattern": "AGENCY.*?([\\d,]+\\.\\d{2})", "type": "currency"},
  "cargo_dues": {"pattern": "CARGO DUES.*?([\\d,]+\\.\\d{2})", "type": "currency"},
  "total": {"pattern": "Total\\s+([\\d,]+\\.\\d{2})", "type": "currency"}
}'::jsonb,
'{
  "customs_duty": "shipment_costs.customs_duty",
  "customs_vat": "shipment_costs.customs_vat",
  "container_landing": "shipment_costs.container_landing",
  "agency_fee": "shipment_costs.agency_fee",
  "cargo_dues": "shipment_costs.cargo_dues",
  "total": "shipment_costs.clearing_cost"
}'::jsonb,
'Nunso-Fast Logistics cc'),

-- Kelilah Shipping Invoice  
('shipping_invoice_kelilah', 'Kelilah Shipping Invoice',
'{
  "text_patterns": ["KELILAH SHIPPING", "IMPORT TAX INVOICE", "OCEAN FREIGHT", "HANDOVER FEE"],
  "identifier_pattern": "KS-\\d{4}",
  "layout_hints": ["shipping_details_table"]
}'::jsonb,
'{
  "invoice_number": {"pattern": "KS-(\\d{4})", "type": "string"},
  "invoice_date": {"pattern": "DATE:\\s*(\\d{2}\\.\\d{2}\\.\\d{4})", "type": "date"},
  "container_number": {"pattern": "CONTAINER NUMBER\\s*(\\w+)", "type": "string"},
  "por": {"pattern": "POR:\\s*(\\w+)", "type": "string"},
  "pod": {"pattern": "POD:\\s*(\\w+)", "type": "string"},
  "vessel": {"pattern": "VSL/VOY:\\s*([\\w\\s]+)", "type": "string"},
  "mbl": {"pattern": "MBL:\\s*(\\w+)", "type": "string"},
  "hbl": {"pattern": "HBL:\\s*(\\w+)", "type": "string"},
  "eta": {"pattern": "ETA:\\s*(\\d{2}\\.\\d{2}\\.\\d{4})", "type": "date"},
  "ocean_freight_usd": {"pattern": "OCEAN FREIGHT\\s+USD\\s+([\\d,]+)", "type": "currency_usd"},
  "roe": {"pattern": "R\\.O\\.E\\.\\s+([\\d.]+)", "type": "number"},
  "ocean_freight_zar": {"pattern": "OCEAN FREIGHT.*?R([\\d,]+\\.\\d{2})", "type": "currency"},
  "handover_fee": {"pattern": "HANDOVER FEE.*?R([\\d,]+\\.\\d{2})", "type": "currency"},
  "total": {"pattern": "GRAND TOTAL.*?R([\\d,]+\\.\\d{2})", "type": "currency"}
}'::jsonb,
'{
  "ocean_freight_usd": "shipment_costs.freight_usd",
  "roe": "shipment_costs.fx_applied_rate",
  "ocean_freight_zar": "shipment_costs.freight_zar",
  "handover_fee": "shipment_costs.handover_fee",
  "total": "shipment_costs.shipping_cost",
  "eta": "shipments.eta",
  "vessel": "shipments.vessel_name",
  "mbl": "shipments.bl_number"
}'::jsonb,
'Kelilah Shipping (Pty) Ltd'),

-- Barakuda Transport Invoice
('transport_invoice_barakuda', 'Barakuda Transport Invoice',
'{
  "text_patterns": ["BARAKUDA FREIGHTLINERS", "Tax Invoice", "TERMINAL TO"],
  "identifier_pattern": "BAR\\d{4}\\w+",
  "color_hints": ["green_header"]
}'::jsonb,
'{
  "invoice_number": {"pattern": "BAR(\\d{4}\\w+)", "type": "string"},
  "invoice_date": {"pattern": "(\\d{4}/\\d{2}/\\d{2})", "type": "date"},
  "container_number": {"pattern": "Container No\\s*(\\w+)", "type": "string"},
  "client_ref": {"pattern": "Client Ref\\s+([\\w\\s-]+LOT\\s*\\d+)", "type": "string"},
  "lot_number": {"pattern": "LOT\\s*(\\d+)", "type": "string"},
  "vessel": {"pattern": "Vessel\\s*(\\w+)", "type": "string"},
  "transport_cost": {"pattern": "TERMINAL TO.*?([\\d\\s,]+\\.\\d{2})", "type": "currency"},
  "gim_surcharge": {"pattern": "GIM SURCHARGE.*?([\\d\\s,]+\\.\\d{2})", "type": "currency"},
  "subtotal": {"pattern": "Subtotal.*?R([\\d\\s,]+\\.\\d{2})", "type": "currency"},
  "vat": {"pattern": "VAT.*?R([\\d\\s,]+\\.\\d{2})", "type": "currency"},
  "total": {"pattern": "Balance Due.*?R([\\d\\s,]+\\.\\d{2})", "type": "currency"}
}'::jsonb,
'{
  "transport_cost": "shipment_costs.transport_cost",
  "gim_surcharge": "shipment_costs.transport_surcharges",
  "total": "shipment_costs.transport_total"
}'::jsonb,
'Barakuda Freightliners'),

-- Internal File Costing Spreadsheet
('file_costing_internal', 'File Costing Sheet',
'{
  "text_patterns": ["LOT", "FOB", "ROE - OURS", "ROE - CLIENT", "NUNSOFAST INVOICE TOTAL"],
  "file_types": [".xlsx", ".xls"],
  "layout_hints": ["excel_costing_format"]
}'::jsonb,
'{
  "lot_number": {"cell": "A1", "pattern": "LOT\\s*(\\d+)", "type": "string"},
  "supplier_name": {"cell": "A1", "pattern": "LOT\\s*\\d+\\s*-\\s*([^-]+)\\s*-", "type": "string"},
  "client_name": {"cell": "A1", "pattern": "-\\s*DOC\\s*([^-]+)$", "type": "string"},
  "commodity": {"cell": "A2", "type": "string"},
  "container_type": {"cell": "B2", "type": "string"},
  "delivery_route": {"cell": "B3", "type": "string"},
  "fob_amount": {"cell": "B5", "type": "currency"},
  "roe_ours": {"cell": "B9", "type": "number"},
  "roe_client": {"cell": "B10", "type": "number"},
  "customs_duty": {"cell": "B16", "type": "currency"},
  "customs_vat": {"cell": "D16", "type": "currency"},
  "container_landing": {"cell": "B18", "type": "currency"},
  "cargo_dues": {"cell": "B19", "type": "currency"},
  "agency_fee": {"cell": "B20", "type": "currency"}
}'::jsonb,
'{
  "lot_number": "shipments.lot_number",
  "supplier_name": "shipments.supplier_id:lookup",
  "client_name": "shipments.client_id:lookup",
  "commodity": "shipments.commodity",
  "fob_amount": "shipment_costs.supplier_cost",
  "roe_ours": "shipment_costs.fx_applied_rate",
  "roe_client": "shipment_costs.fx_client_rate",
  "customs_duty": "shipment_costs.customs_duty",
  "customs_vat": "shipment_costs.customs_vat",
  "container_landing": "shipment_costs.container_landing",
  "cargo_dues": "shipment_costs.cargo_dues",
  "agency_fee": "shipment_costs.agency_fee"
}'::jsonb,
'Internal')
ON CONFLICT (document_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  recognition_patterns = EXCLUDED.recognition_patterns,
  extraction_rules = EXCLUDED.extraction_rules,
  field_mapping = EXCLUDED.field_mapping,
  vendor_name = EXCLUDED.vendor_name,
  updated_at = now();

-- Add additional columns to shipment_costs for new extracted fields
ALTER TABLE shipment_costs 
  ADD COLUMN IF NOT EXISTS customs_duty DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customs_vat DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS container_landing DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cargo_dues DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_fee DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_usd DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_zar DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS handover_fee DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_surcharges DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transport_total DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fx_client_rate DECIMAL(10,4);

-- Add vessel and BL tracking to shipments
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS vessel_name TEXT,
  ADD COLUMN IF NOT EXISTS bl_number TEXT,
  ADD COLUMN IF NOT EXISTS container_number TEXT;

-- Function to recalculate clearing_cost from components
CREATE OR REPLACE FUNCTION calculate_clearing_cost()
RETURNS TRIGGER AS $$
BEGIN
  NEW.clearing_cost := COALESCE(NEW.customs_duty, 0) + 
                       COALESCE(NEW.container_landing, 0) + 
                       COALESCE(NEW.cargo_dues, 0) + 
                       COALESCE(NEW.agency_fee, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_calc_clearing_cost ON shipment_costs;
CREATE TRIGGER trigger_calc_clearing_cost
  BEFORE INSERT OR UPDATE ON shipment_costs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_clearing_cost();