// Vendor Invoice Type Definitions based on actual Favorite Logistics documents

export interface NunsoFastInvoice {
  invoice_number: string;  // IN113565
  invoice_date: string;
  bill_to: string;
  ship_to: {
    vessel: string;
    voyage: string;
    container_type: string;
    container_number: string;
  };
  reference: string;  // "Your Reference" - the LOT number
  tax_reference: string;
  line_items: NunsoFastLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  bank_details: {
    bank: string;
    account: string;
    branch_code: string;
  };
}

export interface NunsoFastLineItem {
  code: 'CDU' | 'CV' | 'CL00' | 'A' | 'CD';  // Customs Duty, Customs VAT, Container Landing, Agency, Cargo Dues
  description: string;
  unit_price: number;
  tax_percent: number;
  nett_price: number;
}

export interface KelilahShippingInvoice {
  invoice_number: string;  // KS-0272
  invoice_date: string;
  our_ref: string;
  client_details: string;
  container_number: string;
  shipping_details: {
    por: string;  // Port of Receipt
    pol: string;  // Port of Loading
    pod: string;  // Port of Discharge
    eta: string;
    vsl_voy: string;  // Vessel/Voyage
    mbl: string;  // Master Bill of Lading
    hbl: string;  // House Bill of Lading
    sob: string;  // Shipped on Board date
  };
  shipment_details: {
    container_type: string;
    description: string;
    weight_kgs: number;
    measurement_cbm: number;
  };
  line_items: KelilahLineItem[];
  subtotal: number;
  grand_total: number;
  bank_details: {
    bank: string;
    account_name: string;
    account_no: string;
    branch_code: string;
    swift: string;
  };
}

export interface KelilahLineItem {
  code: 'OF' | 'HOF';  // Ocean Freight, Handover Fee
  description: string;
  rate: string;  // "USD 3800" or "ZAR 1,650.00"
  roe?: number;  // Rate of Exchange
  total_zar: number;
}

export interface BarakudaTransportInvoice {
  invoice_number: string;  // BAR0845MAJ
  invoice_date: string;
  client: {
    name: string;
    address: string;
    vat: string;
  };
  line_items: BarakudaLineItem[];
  subtotal: number;
  vat: number;
  payments_credits: number;
  balance_due: number;
  bank_details: {
    bank: string;
    branch_code: string;
    account_type: string;
    account_no: string;
  };
}

export interface BarakudaLineItem {
  quantity: number;
  description: string;
  vessel: string;
  container_number: string;
  client_ref: string;  // "18687 - LOT 544"
  amount: number;
}

export interface FileCostingData {
  lot_number: string;
  supplier_name: string;
  client_name: string;
  commodity: string;
  container_type: string;  // 40HQ, 20FT
  delivery_route: string;  // DBN - DBN
  
  // FOB costs
  fob_amount: number;
  fob_total_usd: number;
  fob_total_zar: number;
  
  // Exchange rates
  roe_ours: number;
  roe_client: number;
  
  // Clearing costs (Nunso-Fast)
  customs_duty: number;
  customs_vat: number;
  container_landing: number;
  cargo_dues: number;
  agency_fee: number;
  additional_clearing: number;
  clearing_total: number;
  
  // Shipping (Kelilah)
  shipping_cost: number;
  freight_usd?: number;
  freight_rate?: number;
  
  // Transport (Barakuda)
  transport_cost: number;
  
  // Other
  additional_costs?: number;
  direct_booking?: number;
  
  // Totals
  total_cost_zar: number;
}

export interface DocumentExtractionResult {
  document_type: string;
  confidence: number;
  vendor_identified?: string;
  fields: Record<string, any>;
  amounts?: {
    currency: 'ZAR' | 'USD';
    subtotal: number;
    vat: number;
    total: number;
  };
  raw_text: string;
  matched_shipment_id?: string;
  auto_actions?: Array<{
    action: string;
    table: string;
    fields: string[];
  }>;
  needs_review: boolean;
}

export interface DocumentTypeDefinition {
  id: string;
  document_type: string;
  display_name: string;
  recognition_patterns: {
    text_patterns: string[];
    identifier_pattern?: string;
    color_hints?: string[];
    file_types?: string[];
    layout_hints?: string[];
  };
  extraction_rules: Record<string, {
    pattern?: string;
    cell?: string;
    row_label?: string;
    type: 'string' | 'number' | 'currency' | 'currency_usd' | 'date';
    location?: string;
  }>;
  field_mapping: Record<string, string>;
  vendor_name?: string;
  vendor_id?: string;
  is_active: boolean;
}
