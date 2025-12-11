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
      supplier_cost = 0,
      freight_cost = 0,
      clearing_cost = 0,
      transport_cost = 0,
      bank_charges = 0,
      source_currency = 'USD',
      fx_spot_rate = 18.50,
      fx_applied_rate,
      invoice_number,
      source = 'email'
    } = requestBody;

    if (!lot_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: lot_number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find shipment with supplier info
    const { data: shipment, error: findError } = await supabase
      .from('shipments')
      .select('*, suppliers(id, name), clients(name)')
      .eq('lot_number', lot_number)
      .single();

    if (findError || !shipment) {
      return new Response(
        JSON.stringify({ success: false, error: `Shipment LOT ${lot_number} not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appliedRate = fx_applied_rate || fx_spot_rate;
    const totalForeign = supplier_cost + freight_cost + clearing_cost + transport_cost;
    const totalZar = totalForeign * appliedRate;

    // Check if costs already exist
    const { data: existingCosts } = await supabase
      .from('shipment_costs')
      .select('id')
      .eq('shipment_id', shipment.id)
      .single();

    let costs;
    if (existingCosts) {
      // Update existing costs
      const { data, error } = await supabase
        .from('shipment_costs')
        .update({
          supplier_cost,
          freight_cost,
          clearing_cost,
          transport_cost,
          bank_charges,
          source_currency,
          fx_spot_rate,
          fx_applied_rate: appliedRate,
          total_foreign: totalForeign,
          total_zar: totalZar
        })
        .eq('id', existingCosts.id)
        .select()
        .single();
      
      if (error) throw new Error(`Failed to update costs: ${error.message}`);
      costs = data;
    } else {
      // Insert new costs
      const { data, error } = await supabase
        .from('shipment_costs')
        .insert({
          shipment_id: shipment.id,
          supplier_cost,
          freight_cost,
          clearing_cost,
          transport_cost,
          bank_charges,
          source_currency,
          fx_spot_rate,
          fx_applied_rate: appliedRate,
          total_foreign: totalForeign,
          total_zar: totalZar,
          client_invoice_zar: 0
        })
        .select()
        .single();
      
      if (error) throw new Error(`Failed to create costs: ${error.message}`);
      costs = data;
    }

    // Create supplier ledger debit entry
    if (shipment.suppliers?.id && supplier_cost > 0) {
      await supabase.from('supplier_ledger').insert({
        supplier_id: shipment.suppliers.id,
        shipment_id: shipment.id,
        ledger_type: 'debit',
        amount: supplier_cost,
        description: `Invoice ${invoice_number || 'N/A'} for LOT ${lot_number}`,
        invoice_number,
        transaction_date: new Date().toISOString().split('T')[0]
      });
    }

    const formatCurrency = (amount: number, currency: string) => {
      const symbol = currency === 'ZAR' ? 'R' : currency === 'EUR' ? '€' : '$';
      return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const response = {
      success: true,
      costs,
      message: `Costs added for LOT ${lot_number}`,
      whatsapp_message: `✅ LOT ${lot_number} COSTS UPDATED\n\n💰 Supplier: ${formatCurrency(supplier_cost, source_currency)}\n🚢 Freight: ${formatCurrency(freight_cost, source_currency)}\n📦 Clearing: ${formatCurrency(clearing_cost, source_currency)}\n🚚 Transport: ${formatCurrency(transport_cost, source_currency)}\n💵 Total: ${formatCurrency(totalForeign, source_currency)}\n\n📊 FX Rate: ${appliedRate}\n💰 Total ZAR: ${formatCurrency(totalZar, 'ZAR')}\n\n📍 ${shipment.suppliers?.name || 'N/A'} → ${shipment.clients?.name || 'N/A'}\n⏰ ETA: ${shipment.eta || 'TBD'}\n\n⏳ Profit calculation pending client invoice.`
    };

    await supabase.from('automation_logs').insert({
      source,
      action: 'add_costs',
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
    console.error('Error in shipments-add-costs:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      whatsapp_message: `❌ Failed to add costs for LOT ${requestBody.lot_number}: ${error.message}`
    };

    await supabase.from('automation_logs').insert({
      source: requestBody.source || 'unknown',
      action: 'add_costs',
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
