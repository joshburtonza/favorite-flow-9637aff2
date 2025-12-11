import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const validateApiKey = (req: Request): boolean => {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  const validKey = Deno.env.get('N8N_API_KEY');
  return apiKey === validKey;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let requestBody: any = {};

  try {
    if (!validateApiKey(req)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    requestBody = await req.json();
    const { 
      lot_number, 
      status, 
      document_submitted, 
      document_submitted_date,
      telex_released,
      telex_released_date,
      delivery_date,
      notes,
      source = 'whatsapp'
    } = requestBody;

    if (!lot_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: lot_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find shipment
    const { data: existingShipment, error: findError } = await supabase
      .from('shipments')
      .select('*, suppliers(name), clients(name)')
      .eq('lot_number', lot_number)
      .single();

    if (findError || !existingShipment) {
      return new Response(
        JSON.stringify({ success: false, error: `Shipment LOT ${lot_number} not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updates: any = {};
    if (status) updates.status = status;
    if (document_submitted !== undefined) {
      updates.document_submitted = document_submitted;
      updates.document_submitted_date = document_submitted_date || new Date().toISOString().split('T')[0];
    }
    if (telex_released !== undefined) {
      updates.telex_released = telex_released;
      updates.telex_released_date = telex_released_date || new Date().toISOString().split('T')[0];
    }
    if (delivery_date) updates.delivery_date = delivery_date;
    if (notes) updates.notes = existingShipment.notes 
      ? `${existingShipment.notes}\n[${source}] ${notes}` 
      : `[${source}] ${notes}`;

    // Update shipment
    const { data: updatedShipment, error: updateError } = await supabase
      .from('shipments')
      .update(updates)
      .eq('id', existingShipment.id)
      .select('*, suppliers(name), clients(name)')
      .single();

    if (updateError) throw new Error(`Failed to update shipment: ${updateError.message}`);

    // Build status message
    let statusMessage = `📦 LOT ${lot_number} UPDATED\n`;
    if (status) statusMessage += `\n📊 Status: ${status.toUpperCase()}`;
    if (document_submitted) statusMessage += `\n📄 Documents submitted: ${updates.document_submitted_date}`;
    if (telex_released) statusMessage += `\n📨 Telex released: ${updates.telex_released_date}`;
    if (delivery_date) statusMessage += `\n🚚 Delivered: ${delivery_date}`;
    statusMessage += `\n\n📍 ${existingShipment.suppliers?.name || 'N/A'} → ${existingShipment.clients?.name || 'N/A'}`;

    const response = {
      success: true,
      shipment: updatedShipment,
      message: `Shipment ${lot_number} updated successfully`,
      whatsapp_message: `✅ ${statusMessage}`
    };

    // Log the automation
    await supabase.from('automation_logs').insert({
      source,
      action: 'update_status',
      lot_number,
      request_body: requestBody,
      response,
      success: true
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    const error = err as Error;
    console.error('Error in shipments-update-status:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      whatsapp_message: `❌ Failed to update LOT ${requestBody.lot_number}: ${error.message}`
    };

    await supabase.from('automation_logs').insert({
      source: requestBody.source || 'unknown',
      action: 'update_status',
      lot_number: requestBody.lot_number,
      request_body: requestBody,
      response: errorResponse,
      success: false,
      error: error.message
    });

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
