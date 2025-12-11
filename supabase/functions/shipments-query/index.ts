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
    const { lot_number, status, supplier_name, limit = 10, source = 'whatsapp' } = requestBody;

    let query = supabase
      .from('shipments')
      .select(`
        *,
        suppliers(name, currency),
        clients(name),
        shipment_costs(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (lot_number) {
      query = query.eq('lot_number', lot_number);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: shipments, error } = await query;

    if (error) throw new Error(`Query failed: ${error.message}`);

    // If supplier_name filter, apply in-memory (for partial match)
    let filteredShipments = shipments;
    if (supplier_name) {
      filteredShipments = shipments?.filter(s => 
        s.suppliers?.name?.toLowerCase().includes(supplier_name.toLowerCase())
      );
    }

    const formatCurrency = (amount: number, currency: string) => {
      const symbol = currency === 'ZAR' ? 'R' : currency === 'EUR' ? '€' : '$';
      return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // Build WhatsApp message
    let whatsappMessage = '';
    
    if (lot_number && filteredShipments?.length === 1) {
      // Single shipment detail
      const s = filteredShipments[0];
      const costs = s.shipment_costs;
      whatsappMessage = `📦 LOT ${s.lot_number} DETAILS\n\n`;
      whatsappMessage += `📊 Status: ${s.status.toUpperCase()}\n`;
      whatsappMessage += `📍 ${s.suppliers?.name || 'N/A'} → ${s.clients?.name || 'N/A'}\n`;
      whatsappMessage += `📋 ${s.commodity || 'N/A'}\n`;
      whatsappMessage += `⏰ ETA: ${s.eta || 'TBD'}\n\n`;
      
      if (s.document_submitted) whatsappMessage += `📄 Docs: ${s.document_submitted_date}\n`;
      if (s.telex_released) whatsappMessage += `📨 Telex: ${s.telex_released_date}\n`;
      if (s.delivery_date) whatsappMessage += `🚚 Delivered: ${s.delivery_date}\n`;
      
      if (costs) {
        whatsappMessage += `\n💰 COSTS:\n`;
        whatsappMessage += `Total: ${formatCurrency(costs.total_zar || 0, 'ZAR')}\n`;
        if (costs.client_invoice_zar > 0) {
          whatsappMessage += `Invoice: ${formatCurrency(costs.client_invoice_zar, 'ZAR')}\n`;
          whatsappMessage += `Net Profit: ${formatCurrency(costs.net_profit_zar || 0, 'ZAR')} (${(costs.profit_margin || 0).toFixed(1)}%)\n`;
        }
      }
    } else {
      // List of shipments
      const statusLabel = status ? status.toUpperCase() : 'ALL';
      whatsappMessage = `📦 ${statusLabel} SHIPMENTS (${filteredShipments?.length || 0})\n\n`;
      
      filteredShipments?.slice(0, 5).forEach((s, i) => {
        whatsappMessage += `${i + 1}. LOT ${s.lot_number}\n`;
        whatsappMessage += `   ${s.suppliers?.name || 'N/A'} → ${s.clients?.name || 'N/A'}\n`;
        whatsappMessage += `   ${s.status} | ETA: ${s.eta || 'TBD'}\n\n`;
      });

      if ((filteredShipments?.length || 0) > 5) {
        whatsappMessage += `... and ${filteredShipments!.length - 5} more\n`;
      }
    }

    const response = {
      success: true,
      shipments: filteredShipments,
      count: filteredShipments?.length || 0,
      message: `Found ${filteredShipments?.length || 0} shipments`,
      whatsapp_message: whatsappMessage
    };

    await supabase.from('automation_logs').insert({
      source,
      action: 'query_shipments',
      lot_number: lot_number || null,
      request_body: requestBody,
      response: { count: response.count },
      success: true
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    const error = err as Error;
    console.error('Error in shipments-query:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      whatsapp_message: `❌ Query failed: ${error.message}`
    };

    await supabase.from('automation_logs').insert({
      source: requestBody.source || 'unknown',
      action: 'query_shipments',
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
