import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ExtractionResult {
  document_type: string;
  confidence: number;
  data: {
    supplier_name?: string;
    invoice_number?: string;
    invoice_date?: string;
    amount?: number;
    currency?: string;
    lot_number?: string;
    items?: any[];
    [key: string]: any;
  };
  raw_text: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { queue_id, file_path, source_type } = await req.json();

    console.log(`[OCR] Processing queue_id: ${queue_id}, file: ${file_path}`);

    // Update status
    await supabase.from('document_extraction_queue')
      .update({ status: 'processing', processing_started_at: new Date().toISOString() })
      .eq('id', queue_id);

    const startTime = Date.now();

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(file_path);

    if (downloadError) throw downloadError;

    // Convert to base64 for AI
    const buffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mimeType = getMimeType(file_path);

    // Call AI for OCR and extraction
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a document extraction AI for Favorite Logistics, a freight forwarding company.
Extract data from documents and return structured JSON.

KNOWN VENDOR DOCUMENT TYPES:
1. clearing_agent_nunsofast - Nunso-Fast Clearing Invoice
   - Pink/salmon colored header
   - Contains: CUSTOMS DUTY, CUSTOMS VAT, CONTAINER LANDING, AGENCY, CARGO DUES
   - Invoice format: IN123456
   - Look for: "Your Reference" field = LOT number

2. shipping_invoice_kelilah - Kelilah Shipping Invoice
   - Contains: OCEAN FREIGHT (USD), R.O.E., HANDOVER FEE
   - Invoice format: KS-0123
   - Has shipping details: POR, POD, ETA, VSL/VOY, MBL, HBL

3. transport_invoice_barakuda - Barakuda Transport Invoice
   - Green header
   - Contains: Transport costs, GIM SURCHARGE
   - Invoice format: BAR0123XXX
   - Look for: LOT number in Client Ref field

4. file_costing_internal - Internal File Costing (Excel)
   - Header format: "LOT XXX - SUPPLIER - DOC CLIENT"
   - Contains: FOB, ROE values, clearing costs breakdown

OTHER DOCUMENT TYPES:
- supplier_invoice, packing_list, bill_of_lading, telex_release, commercial_invoice

EXTRACTION RULES:
- Parse all amounts as numbers (remove R, $, ZAR, USD, commas)
- Convert dates to YYYY-MM-DD
- Extract container numbers (XXXX1234567 format)
- Extract LOT numbers from any reference field
- Extract vessel names exactly as shown

Always return JSON:
{
  "document_type": "clearing_agent_nunsofast|shipping_invoice_kelilah|transport_invoice_barakuda|supplier_invoice|...|unknown",
  "confidence": 0.0-1.0,
  "data": { 
    "supplier_name": "...",
    "invoice_number": "...",
    "invoice_date": "YYYY-MM-DD",
    "lot_number": "...",
    "container_number": "...",
    "vessel": "...",
    "amount": 0.00,
    "currency": "USD|ZAR",
    "customs_duty": 0.00,
    "customs_vat": 0.00,
    "container_landing": 0.00,
    "cargo_dues": 0.00,
    "agency_fee": 0.00,
    "ocean_freight_usd": 0.00,
    "ocean_freight_zar": 0.00,
    "roe": 0.0000,
    "handover_fee": 0.00,
    "transport_cost": 0.00,
    "items": []
  },
  "raw_text": "full extracted text"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              },
              {
                type: 'text',
                text: 'Extract all data from this document. Identify the document type and return structured JSON. Be thorough and extract all amounts, dates, and reference numbers.'
              }
            ]
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI API error: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const extractedContent = aiData.choices[0].message.content;
    
    console.log(`[OCR] AI response received, parsing...`);

    // Parse AI response
    let extraction: ExtractionResult;
    try {
      // Find JSON in response
      const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
      extraction = JSON.parse(jsonMatch?.[0] || extractedContent);
    } catch {
      extraction = {
        document_type: 'unknown',
        confidence: 0,
        data: {},
        raw_text: extractedContent
      };
    }

    // Match to existing entities
    const matches = await matchEntities(supabase, extraction.data);

    console.log(`[OCR] Matched entities:`, matches);

    // Determine if auto-action is possible
    const autoActions: any[] = [];
    let needsReview = extraction.confidence < 0.7;

    // Auto-update records if high confidence and matched shipment
    if (extraction.confidence >= 0.85 && matches.shipment_id) {
      // Nunso-Fast Clearing Invoice
      if (extraction.document_type === 'clearing_agent_nunsofast' || extraction.document_type === 'clearing_agent_invoice') {
        const updateData: any = {};
        if (extraction.data.customs_duty) updateData.customs_duty = extraction.data.customs_duty;
        if (extraction.data.customs_vat) updateData.customs_vat = extraction.data.customs_vat;
        if (extraction.data.container_landing) updateData.container_landing = extraction.data.container_landing;
        if (extraction.data.cargo_dues) updateData.cargo_dues = extraction.data.cargo_dues;
        if (extraction.data.agency_fee) updateData.agency_fee = extraction.data.agency_fee;
        if (extraction.data.amount) updateData.clearing_cost = extraction.data.amount;

        if (Object.keys(updateData).length > 0) {
          await supabase.from('shipment_costs')
            .upsert({ shipment_id: matches.shipment_id, ...updateData }, { onConflict: 'shipment_id' });

          autoActions.push({
            action: 'update_clearing_costs',
            shipment_id: matches.shipment_id,
            data: updateData
          });
        }
      }

      // Kelilah Shipping Invoice
      if (extraction.document_type === 'shipping_invoice_kelilah' || extraction.document_type === 'shipping_invoice') {
        const updateData: any = {};
        if (extraction.data.ocean_freight_usd) updateData.freight_usd = extraction.data.ocean_freight_usd;
        if (extraction.data.ocean_freight_zar) updateData.freight_zar = extraction.data.ocean_freight_zar;
        if (extraction.data.roe) updateData.fx_applied_rate = extraction.data.roe;
        if (extraction.data.handover_fee) updateData.handover_fee = extraction.data.handover_fee;
        if (extraction.data.amount) updateData.freight_cost = extraction.data.amount;

        if (Object.keys(updateData).length > 0) {
          await supabase.from('shipment_costs')
            .upsert({ shipment_id: matches.shipment_id, ...updateData }, { onConflict: 'shipment_id' });

          autoActions.push({
            action: 'update_shipping_costs',
            shipment_id: matches.shipment_id,
            data: updateData
          });
        }

        // Update shipment with vessel/BL info
        const shipmentUpdate: any = {};
        if (extraction.data.vessel) shipmentUpdate.vessel_name = extraction.data.vessel;
        if (extraction.data.mbl) shipmentUpdate.bl_number = extraction.data.mbl;
        if (extraction.data.eta) shipmentUpdate.eta = extraction.data.eta;
        if (extraction.data.container_number) shipmentUpdate.container_number = extraction.data.container_number;

        if (Object.keys(shipmentUpdate).length > 0) {
          await supabase.from('shipments')
            .update(shipmentUpdate)
            .eq('id', matches.shipment_id);
        }
      }

      // Barakuda Transport Invoice
      if (extraction.document_type === 'transport_invoice_barakuda' || extraction.document_type === 'transport_invoice') {
        const updateData: any = {};
        if (extraction.data.transport_cost) updateData.transport_cost = extraction.data.transport_cost;
        if (extraction.data.gim_surcharge) updateData.transport_surcharges = extraction.data.gim_surcharge;
        if (extraction.data.amount) updateData.transport_total = extraction.data.amount;

        if (Object.keys(updateData).length > 0) {
          await supabase.from('shipment_costs')
            .upsert({ shipment_id: matches.shipment_id, ...updateData }, { onConflict: 'shipment_id' });

          autoActions.push({
            action: 'update_transport_cost',
            shipment_id: matches.shipment_id,
            data: updateData
          });
        }
      }

      // Supplier Invoice
      if (extraction.document_type === 'supplier_invoice') {
        await supabase.from('shipment_costs')
          .upsert({ 
            shipment_id: matches.shipment_id,
            supplier_cost: extraction.data.amount,
            source_currency: extraction.data.currency || 'USD'
          }, { onConflict: 'shipment_id' });

        autoActions.push({
          action: 'update_supplier_cost',
          shipment_id: matches.shipment_id,
          amount: extraction.data.amount,
          currency: extraction.data.currency
        });
      }

      // Telex Release
      if (extraction.document_type === 'telex_release') {
        await supabase.from('shipments')
          .update({ 
            telex_released: true,
            telex_released_date: new Date().toISOString().split('T')[0]
          })
          .eq('id', matches.shipment_id);

        autoActions.push({
          action: 'mark_telex_released',
          shipment_id: matches.shipment_id
        });
      }
    } else if (extraction.confidence < 0.5) {
      needsReview = true;
    }

    const processingTime = Date.now() - startTime;

    // Update queue with results
    await supabase.from('document_extraction_queue')
      .update({
        status: needsReview ? 'needs_review' : 'completed',
        extracted_text: extraction.raw_text?.substring(0, 10000), // Limit text size
        extracted_data: extraction.data,
        confidence_score: extraction.confidence,
        document_type: extraction.document_type,
        matched_supplier_id: matches.supplier_id,
        matched_shipment_id: matches.shipment_id,
        matched_client_id: matches.client_id,
        needs_human_review: needsReview,
        auto_actions_taken: autoActions,
        processing_completed_at: new Date().toISOString(),
        processing_time_ms: processingTime
      })
      .eq('id', queue_id);

    // Notify if needs review
    if (needsReview) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/flair-notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'alert',
          title: '📄 Document Needs Review',
          message: `A ${extraction.document_type || 'document'} requires manual review.\nConfidence: ${(extraction.confidence * 100).toFixed(0)}%${extraction.data.lot_number ? `\nLOT: ${extraction.data.lot_number}` : ''}`
        })
      });
    }

    // Notify if auto-actions were taken
    if (autoActions.length > 0) {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/flair-notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'update',
          title: '✅ Document Auto-Processed',
          message: `${extraction.document_type} for ${matches.lot_number || 'shipment'} was automatically processed.\n${autoActions.map(a => `• ${a.action}`).join('\n')}`
        })
      });
    }

    console.log(`[OCR] Complete. Type: ${extraction.document_type}, Confidence: ${extraction.confidence}, Actions: ${autoActions.length}`);

    return new Response(JSON.stringify({
      success: true,
      extraction,
      matches,
      auto_actions: autoActions,
      needs_review: needsReview,
      processing_time_ms: processingTime
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[OCR] Error:', error);

    // Update queue with error
    const body = await req.json().catch(() => ({}));
    if (body.queue_id) {
      await supabase.from('document_extraction_queue')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', body.queue_id);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function matchEntities(supabase: any, data: any) {
  const matches: any = {};

  // Match supplier by name
  if (data.supplier_name) {
    const searchName = data.supplier_name.replace(/[^\w\s]/g, '').trim();
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name')
      .ilike('name', `%${searchName}%`)
      .limit(1);
    
    if (suppliers?.[0]) {
      matches.supplier_id = suppliers[0].id;
      matches.supplier_name = suppliers[0].name;
    }
  }

  // Match shipment by LOT number
  if (data.lot_number) {
    const lotNum = data.lot_number.toString().replace(/[^\d]/g, '');
    const { data: shipments } = await supabase
      .from('shipments')
      .select('id, lot_number, client_id')
      .or(`lot_number.ilike.%${lotNum}%,lot_number.ilike.%LOT ${lotNum}%,lot_number.ilike.%LOT${lotNum}%`)
      .limit(1);

    if (shipments?.[0]) {
      matches.shipment_id = shipments[0].id;
      matches.lot_number = shipments[0].lot_number;
      matches.client_id = shipments[0].client_id;
    }
  }

  // Match client by name if not already found
  if (data.client_name && !matches.client_id) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .ilike('name', `%${data.client_name}%`)
      .limit(1);

    if (clients?.[0]) {
      matches.client_id = clients[0].id;
      matches.client_name = clients[0].name;
    }
  }

  return matches;
}

function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}
