import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Standard row locations in Favorite Logistics file costing template
const FILE_COSTING_STRUCTURE = {
  header: { row: 1, col: 'A' },  // "LOT XXX - SUPPLIER - DOC CLIENT"
  commodity: { row: 2, col: 'A' },
  container_type: { row: 2, col: 'B' },
  delivery: { row: 3, col: 'B' },
  
  fob_amount: { row: 5, col: 'B' },
  fob_total_usd: { row: 7, col: 'B' },
  fob_total_zar: { row: 7, col: 'C' },
  
  roe_ours: { row: 9, col: 'B' },
  roe_client: { row: 10, col: 'B' },
  
  customs_duty: { row: 16, col: 'B' },
  customs_vat: { row: 16, col: 'D' },
  container_landing: { row: 18, col: 'B' },
  cargo_dues: { row: 19, col: 'B' },
  agency_fee: { row: 20, col: 'B' },
  additional_clearing: { row: 21, col: 'B' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { file_path, auto_update } = await req.json();

    console.log('[ParseCosting] Processing:', file_path);

    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(file_path);

    if (downloadError || !fileData) {
      throw new Error(`File not found: ${downloadError?.message || 'Unknown error'}`);
    }

    // Parse Excel using SheetJS
    const XLSX = await import('npm:xlsx@0.18.5');
    const buffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const ws = workbook.Sheets[workbook.SheetNames[0]];

    // Extract data from known positions
    const extracted: Record<string, any> = {
      document_type: 'file_costing_internal',
      confidence: 0.95
    };

    // Helper to get cell value
    const getCell = (ref: string): any => {
      const cell = ws[ref];
      return cell?.v ?? null;
    };

    // Helper to parse currency
    const parseNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'number') return value;
      const cleaned = value.toString().replace(/[R$,\s]/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    // Header parsing: "LOT 544 - UBEN TEXTILES - DOC MJ"
    const header = getCell('A1') || '';
    const headerMatch = header.toString().match(/LOT\s*(\d+)\s*-\s*([^-]+)\s*-\s*(?:DOC\s*)?(.+)/i);
    if (headerMatch) {
      extracted.lot_number = headerMatch[1];
      extracted.supplier_name = headerMatch[2].trim();
      extracted.client_name = headerMatch[3].trim();
    }

    // Fixed positions
    extracted.commodity = getCell('A2');
    extracted.container_type = getCell('B2');
    extracted.delivery_route = getCell('B3');
    
    extracted.fob_amount = parseNumber(getCell('B5'));
    extracted.fob_total_usd = parseNumber(getCell('B7'));
    extracted.fob_total_zar = parseNumber(getCell('C7'));
    
    extracted.roe_ours = parseNumber(getCell('B9'));
    extracted.roe_client = parseNumber(getCell('B10'));
    
    extracted.customs_duty = parseNumber(getCell('B16'));
    extracted.customs_vat = parseNumber(getCell('D16'));
    extracted.container_landing = parseNumber(getCell('B18'));
    extracted.cargo_dues = parseNumber(getCell('B19'));
    extracted.agency_fee = parseNumber(getCell('B20'));
    extracted.additional_clearing = parseNumber(getCell('B21'));

    // Search for shipping and transport by row label
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:I61');
    for (let row = range.s.r; row <= range.e.r; row++) {
      const labelCellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
      const valueCellRef = XLSX.utils.encode_cell({ r: row, c: 1 });
      const noteCellRef = XLSX.utils.encode_cell({ r: row, c: 2 });
      
      const labelCell = ws[labelCellRef]?.v?.toString().toUpperCase() || '';
      const valueCell = ws[valueCellRef]?.v;
      const noteCell = ws[noteCellRef]?.v;
      
      // Ocean freight
      if (labelCell.includes('KELLILAH') || labelCell.includes('KELILAH') || labelCell.includes('OCEAN FREIGHT')) {
        extracted.shipping_cost = parseNumber(valueCell);
        // Check for rate notation in column C (e.g., "$3800@18.50")
        if (noteCell) {
          const rateMatch = noteCell.toString().match(/\$(\d+)@([\d.]+)/);
          if (rateMatch) {
            extracted.freight_usd = parseFloat(rateMatch[1]);
            extracted.freight_rate = parseFloat(rateMatch[2]);
          }
        }
      }
      
      // Transport
      if (labelCell === 'TRANSPORT' || labelCell.includes('BARAKUDA')) {
        extracted.transport_cost = parseNumber(valueCell);
      }
      
      // Additional costs
      if (labelCell.includes('SRS') || labelCell.includes('SRD') || labelCell.includes('ADDITIONAL')) {
        extracted.additional_costs = parseNumber(valueCell);
      }
      
      // Direct booking
      if (labelCell.includes('DIRECT BOOKING')) {
        extracted.direct_booking = parseNumber(valueCell);
      }

      // Bank charges
      if (labelCell.includes('BANK') && labelCell.includes('CHARGE')) {
        extracted.bank_charges = parseNumber(valueCell);
      }

      // FX Commission
      if (labelCell.includes('FX') && labelCell.includes('COMMISSION')) {
        extracted.fx_commission = parseNumber(valueCell);
      }
    }

    // Calculate totals
    extracted.clearing_total = 
      (extracted.customs_duty || 0) + 
      (extracted.container_landing || 0) + 
      (extracted.cargo_dues || 0) + 
      (extracted.agency_fee || 0) +
      (extracted.additional_clearing || 0);

    extracted.total_cost_zar = 
      (extracted.fob_total_zar || 0) +
      (extracted.clearing_total || 0) +
      (extracted.shipping_cost || 0) +
      (extracted.transport_cost || 0) +
      (extracted.additional_costs || 0);

    console.log('[ParseCosting] Extracted:', extracted);

    // Find matching shipment
    let shipmentId = null;
    if (extracted.lot_number) {
      const { data: shipment } = await supabase
        .from('shipments')
        .select('id, lot_number')
        .ilike('lot_number', `%${extracted.lot_number}%`)
        .limit(1)
        .maybeSingle();
      
      if (shipment) {
        shipmentId = shipment.id;
        console.log('[ParseCosting] Matched shipment:', shipment.lot_number);
      }
    }

    // Auto-update if requested and shipment found
    const updates: any[] = [];
    if (auto_update && shipmentId) {
      const costUpdate: Record<string, any> = {
        shipment_id: shipmentId,
        updated_at: new Date().toISOString()
      };

      // Map extracted fields to shipment_costs columns
      if (extracted.fob_amount != null) costUpdate.supplier_cost = extracted.fob_amount;
      if (extracted.fob_total_zar != null) costUpdate.total_zar = extracted.fob_total_zar;
      if (extracted.roe_ours != null) costUpdate.fx_applied_rate = extracted.roe_ours;
      if (extracted.roe_client != null) costUpdate.fx_client_rate = extracted.roe_client;
      if (extracted.customs_duty != null) costUpdate.customs_duty = extracted.customs_duty;
      if (extracted.customs_vat != null) costUpdate.customs_vat = extracted.customs_vat;
      if (extracted.container_landing != null) costUpdate.container_landing = extracted.container_landing;
      if (extracted.cargo_dues != null) costUpdate.cargo_dues = extracted.cargo_dues;
      if (extracted.agency_fee != null) costUpdate.agency_fee = extracted.agency_fee;
      if (extracted.clearing_total != null) costUpdate.clearing_cost = extracted.clearing_total;
      if (extracted.shipping_cost != null) costUpdate.freight_cost = extracted.shipping_cost;
      if (extracted.freight_usd != null) costUpdate.freight_usd = extracted.freight_usd;
      if (extracted.transport_cost != null) costUpdate.transport_cost = extracted.transport_cost;
      if (extracted.bank_charges != null) costUpdate.bank_charges = extracted.bank_charges;

      const { error } = await supabase
        .from('shipment_costs')
        .upsert(costUpdate, { onConflict: 'shipment_id' });

      if (!error) {
        updates.push({ 
          table: 'shipment_costs', 
          fields: Object.keys(costUpdate).filter(k => k !== 'shipment_id' && k !== 'updated_at')
        });
        console.log('[ParseCosting] Updated shipment_costs');
      } else {
        console.error('[ParseCosting] Update error:', error);
      }

      // Update shipment commodity if extracted
      if (extracted.commodity) {
        const { error: shipError } = await supabase
          .from('shipments')
          .update({ commodity: extracted.commodity })
          .eq('id', shipmentId);
        
        if (!shipError) {
          updates.push({ table: 'shipments', fields: ['commodity'] });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      document_type: 'file_costing_internal',
      extracted,
      shipment_id: shipmentId,
      auto_updates: updates,
      confidence: 0.95
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[ParseCosting] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
