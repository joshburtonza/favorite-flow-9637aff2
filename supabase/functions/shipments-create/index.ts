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
    const { lot_number, supplier_name, client_name, commodity, eta, source = 'whatsapp' } = requestBody;

    if (!lot_number || !supplier_name || !client_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: lot_number, supplier_name, client_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find or create supplier
    let { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', supplier_name)
      .single();

    if (!supplier) {
      const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({ name: supplier_name, currency: 'USD' })
        .select('id')
        .single();
      
      if (supplierError) throw new Error(`Failed to create supplier: ${supplierError.message}`);
      supplier = newSupplier;
    }

    // Find or create client
    let { data: client } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', client_name)
      .single();

    if (!client) {
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({ name: client_name })
        .select('id')
        .single();
      
      if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);
      client = newClient;
    }

    // Create shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        lot_number,
        supplier_id: supplier.id,
        client_id: client.id,
        commodity: commodity || null,
        eta: eta || null,
        status: 'pending',
        notes: `Created via ${source}`
      })
      .select('id, lot_number')
      .single();

    if (shipmentError) throw new Error(`Failed to create shipment: ${shipmentError.message}`);

    const response = {
      success: true,
      shipment_id: shipment.id,
      message: `Shipment ${lot_number} created successfully`,
      whatsapp_message: `✅ NEW SHIPMENT CREATED\n\n📦 LOT ${lot_number}\n📍 ${supplier_name} → ${client_name}\n📋 ${commodity || 'N/A'}\n⏰ ETA: ${eta || 'TBD'}\n\nReady for tracking!`
    };

    // Log the automation
    await supabase.from('automation_logs').insert({
      source,
      action: 'create_shipment',
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
    console.error('Error in shipments-create:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      whatsapp_message: `❌ Failed to create shipment: ${error.message}`
    };

    // Log the error
    await supabase.from('automation_logs').insert({
      source: requestBody.source || 'unknown',
      action: 'create_shipment',
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
