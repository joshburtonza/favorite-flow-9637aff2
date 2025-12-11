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
    const { lot_number, client_invoice_zar, source = 'whatsapp' } = requestBody;

    if (!lot_number || client_invoice_zar === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: lot_number, client_invoice_zar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find shipment
    const { data: shipment, error: findError } = await supabase
      .from('shipments')
      .select('*, suppliers(name), clients(name)')
      .eq('lot_number', lot_number)
      .single();

    if (findError || !shipment) {
      return new Response(
        JSON.stringify({ success: false, error: `Shipment LOT ${lot_number} not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find costs
    const { data: costs, error: costsError } = await supabase
      .from('shipment_costs')
      .select('*')
      .eq('shipment_id', shipment.id)
      .single();

    if (costsError || !costs) {
      return new Response(
        JSON.stringify({ success: false, error: `No costs found for LOT ${lot_number}. Add costs first.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate profit
    const totalZar = costs.total_zar || 0;
    const fxSpread = costs.fx_spot_rate - costs.fx_applied_rate;
    const totalForeign = costs.total_foreign || 0;
    
    const grossProfitZar = client_invoice_zar - totalZar;
    const fxCommissionZar = totalZar * 0.014; // 1.4% commission
    const fxSpreadProfitZar = totalForeign * fxSpread;
    const netProfitZar = grossProfitZar + fxCommissionZar + fxSpreadProfitZar - (costs.bank_charges || 0);
    const profitMargin = client_invoice_zar > 0 ? (netProfitZar / client_invoice_zar) * 100 : 0;

    // Update costs with revenue and calculated profits
    const { data: updatedCosts, error: updateError } = await supabase
      .from('shipment_costs')
      .update({
        client_invoice_zar,
        gross_profit_zar: grossProfitZar,
        fx_commission_zar: fxCommissionZar,
        fx_spread: fxSpread,
        fx_spread_profit_zar: fxSpreadProfitZar,
        net_profit_zar: netProfitZar,
        profit_margin: profitMargin
      })
      .eq('id', costs.id)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to update revenue: ${updateError.message}`);

    const formatCurrency = (amount: number) => {
      return `R${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const profitData = {
      gross_profit_zar: grossProfitZar,
      fx_commission_zar: fxCommissionZar,
      fx_spread_profit_zar: fxSpreadProfitZar,
      net_profit_zar: netProfitZar,
      profit_margin: profitMargin
    };

    const response = {
      success: true,
      profit_data: profitData,
      costs: updatedCosts,
      message: `Revenue added for LOT ${lot_number}`,
      whatsapp_message: `💰 LOT ${lot_number} PROFIT CALCULATED\n\n📊 Client Invoice: ${formatCurrency(client_invoice_zar)}\n📦 Total Costs: ${formatCurrency(totalZar)}\n\n💵 Gross Profit: ${formatCurrency(grossProfitZar)}\n💱 FX Commission: ${formatCurrency(fxCommissionZar)}\n📈 FX Spread Profit: ${formatCurrency(fxSpreadProfitZar)}\n🏦 Bank Charges: ${formatCurrency(costs.bank_charges || 0)}\n\n✅ NET PROFIT: ${formatCurrency(netProfitZar)}\n📊 Margin: ${profitMargin.toFixed(2)}%\n\n📍 ${shipment.suppliers?.name || 'N/A'} → ${shipment.clients?.name || 'N/A'}`
    };

    await supabase.from('automation_logs').insert({
      source,
      action: 'add_revenue',
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
    console.error('Error in shipments-add-revenue:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      whatsapp_message: `❌ Failed to add revenue for LOT ${requestBody.lot_number}: ${error.message}`
    };

    await supabase.from('automation_logs').insert({
      source: requestBody.source || 'unknown',
      action: 'add_revenue',
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
