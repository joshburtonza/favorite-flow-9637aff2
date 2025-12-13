import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, source = 'api' } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing query: "${query}" from source: ${source}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use AI to interpret the query and determine what data to fetch
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a query interpreter for a freight forwarding system. Analyze the user's natural language query and determine:
1. What entity type(s) they're asking about: clients, suppliers, shipments, payments, or balances
2. Any specific filters (names, LOT numbers, statuses, dates)
3. What information they want (summary, details, list, balance, etc.)

Respond with a JSON object:
{
  "entities": ["shipments", "clients", "suppliers", "payments"], // which tables to query
  "filters": {
    "lot_number": "optional lot number",
    "client_name": "optional client name pattern",
    "supplier_name": "optional supplier name pattern",
    "status": "optional status filter",
    "type": "summary|detail|list|balance"
  },
  "intent": "brief description of what user wants"
}

Examples:
- "Show me LOT 881" → entities: ["shipments"], filters: {lot_number: "881", type: "detail"}
- "What's the balance for WINTEX?" → entities: ["suppliers"], filters: {supplier_name: "WINTEX", type: "balance"}
- "List all pending shipments" → entities: ["shipments"], filters: {status: "pending", type: "list"}
- "Update me on MJ Oils" → entities: ["clients", "shipments"], filters: {client_name: "MJ Oils", type: "summary"}
- "Show payments due this week" → entities: ["payments"], filters: {type: "list"}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Gateway error:', await aiResponse.text());
      throw new Error('Failed to interpret query');
    }

    const aiData = await aiResponse.json();
    const interpretation = aiData.choices[0]?.message?.content;
    
    console.log('AI interpretation:', interpretation);

    // Parse the AI response
    let parsedIntent;
    try {
      const jsonMatch = interpretation.match(/\{[\s\S]*\}/);
      parsedIntent = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      parsedIntent = { entities: ['shipments'], filters: { type: 'list' }, intent: query };
    }

    // Gather data based on interpretation
    const results: Record<string, any> = {};
    const { entities = [], filters = {} } = parsedIntent || {};

    // Query shipments
    if (entities.includes('shipments')) {
      let shipmentQuery = supabase.from('v_shipments_full').select('*');
      
      if (filters.lot_number) {
        shipmentQuery = shipmentQuery.ilike('lot_number', `%${filters.lot_number}%`);
      }
      if (filters.status) {
        shipmentQuery = shipmentQuery.eq('status', filters.status);
      }
      if (filters.client_name) {
        shipmentQuery = shipmentQuery.ilike('client_name', `%${filters.client_name}%`);
      }
      if (filters.supplier_name) {
        shipmentQuery = shipmentQuery.ilike('supplier_name', `%${filters.supplier_name}%`);
      }
      
      const { data: shipments, error } = await shipmentQuery.order('created_at', { ascending: false }).limit(10);
      if (error) console.error('Shipments query error:', error);
      results.shipments = shipments || [];
    }

    // Query clients
    if (entities.includes('clients')) {
      let clientQuery = supabase.from('clients').select('*');
      
      if (filters.client_name) {
        clientQuery = clientQuery.ilike('name', `%${filters.client_name}%`);
      }
      
      const { data: clients, error } = await clientQuery.order('name').limit(10);
      if (error) console.error('Clients query error:', error);
      results.clients = clients || [];
    }

    // Query suppliers
    if (entities.includes('suppliers')) {
      let supplierQuery = supabase.from('suppliers').select('*');
      
      if (filters.supplier_name) {
        supplierQuery = supplierQuery.ilike('name', `%${filters.supplier_name}%`);
      }
      
      const { data: suppliers, error } = await supplierQuery.order('name').limit(10);
      if (error) console.error('Suppliers query error:', error);
      results.suppliers = suppliers || [];

      // Get ledger transactions if balance requested
      if (filters.type === 'balance' && results.suppliers?.length > 0) {
        const supplierId = results.suppliers[0].id;
        const { data: ledger } = await supabase
          .from('supplier_ledger')
          .select('*, shipments(lot_number)')
          .eq('supplier_id', supplierId)
          .order('transaction_date', { ascending: false })
          .limit(5);
        results.ledger = ledger || [];
      }
    }

    // Query payments
    if (entities.includes('payments')) {
      const { data: payments, error } = await supabase
        .from('v_pending_payments')
        .select('*')
        .order('payment_date')
        .limit(10);
      if (error) console.error('Payments query error:', error);
      results.payments = payments || [];
    }

    // Format response using AI
    const formatPrompt = `Format this data into a clear, concise response. Use emojis for visual appeal. Be brief but informative.

Query: "${query}"
Intent: ${parsedIntent?.intent || 'general query'}

Data:
${JSON.stringify(results, null, 2)}

Format rules:
- Use 📦 for shipments, 👤 for clients, 🏭 for suppliers, 💰 for payments/money
- Include key numbers (totals, balances, counts)
- Use currency formatting (R for ZAR, $ for USD, € for EUR)
- Keep response under 500 characters for readability
- If no data found, say so clearly`;

    const formatResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that formats freight forwarding data into clear, readable summaries.' },
          { role: 'user', content: formatPrompt }
        ],
      }),
    });

    let formattedMessage = 'Unable to format response';
    if (formatResponse.ok) {
      const formatData = await formatResponse.json();
      formattedMessage = formatData.choices[0]?.message?.content || formattedMessage;
    }

    // Log the query
    await supabase.from('automation_logs').insert({
      source,
      action: 'natural_language_query',
      request_body: { query, interpretation: parsedIntent },
      response: { results, formatted: formattedMessage },
      success: true,
    });

    console.log('Query completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        query,
        interpretation: parsedIntent,
        data: results,
        message: formattedMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Query error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
