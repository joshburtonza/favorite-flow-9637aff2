import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
            content: `You are a document extraction AI for a freight forwarding company. 
Extract data from documents and return structured JSON.

Document types you handle:
- supplier_invoice: Has supplier name, invoice number, amounts, currency
- packing_list: Has items, weights, quantities, container info
- bill_of_lading: Has shipping details, BL number, vessel, consignee
- clearing_agent_invoice: Has customs duties, VAT, fees, agency charges
- transport_invoice: Has transport costs, delivery details, truck info
- telex_release: Confirmation of cargo release
- commercial_invoice: Product pricing, FOB values

Look for LOT numbers in format "LOT XXX" or similar references.

Always return JSON with:
{
  "document_type": "supplier_invoice|packing_list|bill_of_lading|clearing_agent_invoice|transport_invoice|telex_release|commercial_invoice|unknown",
  "confidence": 0.0-1.0,
  "data": { 
    "supplier_name": "...",
    "invoice_number": "...",
    "invoice_date": "YYYY-MM-DD",
    "lot_number": "...",
    "amount": 0.00,
    "currency": "USD|ZAR|EUR",
    "customs_duty": 0.00,
    "customs_vat": 0.00,
    "agency_fee": 0.00,
    "transport_cost": 0.00,
    "items": []
  },
  "raw_text": "full text from document"
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
      if (extraction.document_type === 'clearing_agent_invoice') {
        const updateData: any = {};
        if (extraction.data.customs_duty) updateData.customs_duty = extraction.data.customs_duty;
        if (extraction.data.customs_vat) updateData.customs_vat = extraction.data.customs_vat;
        if (extraction.data.agency_fee) updateData.clearing_cost = extraction.data.agency_fee;
        if (extraction.data.amount) updateData.clearing_cost = extraction.data.amount;

        if (Object.keys(updateData).length > 0) {
          await supabase.from('shipment_costs')
            .update(updateData)
            .eq('shipment_id', matches.shipment_id);

          autoActions.push({
            action: 'update_clearing_costs',
            shipment_id: matches.shipment_id,
            data: updateData
          });
        }
      }

      if (extraction.document_type === 'transport_invoice') {
        await supabase.from('shipment_costs')
          .update({ transport_cost: extraction.data.transport_cost || extraction.data.amount })
          .eq('shipment_id', matches.shipment_id);

        autoActions.push({
          action: 'update_transport_cost',
          shipment_id: matches.shipment_id,
          amount: extraction.data.transport_cost || extraction.data.amount
        });
      }

      if (extraction.document_type === 'supplier_invoice') {
        await supabase.from('shipment_costs')
          .update({ 
            supplier_cost: extraction.data.amount,
            source_currency: extraction.data.currency || 'USD'
          })
          .eq('shipment_id', matches.shipment_id);

        autoActions.push({
          action: 'update_supplier_cost',
          shipment_id: matches.shipment_id,
          amount: extraction.data.amount,
          currency: extraction.data.currency
        });
      }

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
