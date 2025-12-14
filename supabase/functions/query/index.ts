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
    const { query, source = 'api', includeActivity = true } = await req.json();
    
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

    // Fetch recent activity for AI context
    let recentActivity: any[] = [];
    if (includeActivity) {
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('action_type, entity_type, entity_name, description, user_email, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      recentActivity = activities || [];
    }

    // Use AI to interpret the query and determine what data to fetch
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const activityContext = recentActivity.length > 0 
      ? `\n\nRecent Activity (last 20 actions):\n${recentActivity.map(a => 
          `- ${getTimeAgo(new Date(a.created_at))}: ${a.user_email || 'System'} ${a.action_type} ${a.entity_type}: ${a.entity_name || ''} - ${a.description}`
        ).join('\n')}`
      : '';

    const systemPrompt = `You are an AI assistant with COMPLETE REAL-TIME AWARENESS of Favorite Logistics freight forwarding system.

## 🔴 WHAT JUST HAPPENED (RECENT CHANGES):
${activityContext || 'No recent activity recorded'}

## YOUR CAPABILITIES:
1. You are ALWAYS aware of recent changes - shipments updated, documents uploaded, costs added, payments made
2. Query any data: clients, suppliers, shipments, payments, balances
3. Understand context from recent activity logs
4. Provide insights based on patterns in activities
5. Answer questions about what's been happening in the system

## IMPORTANT:
- When asked "what's new", "what changed", "update me" - focus on the RECENT ACTIVITY section
- If a shipment was just updated, mention it proactively
- Be aware of who made changes (from user_email)

When analyzing a query, respond with a JSON object:
{
  "entities": ["shipments", "clients", "suppliers", "payments", "activities"],
  "filters": {
    "lot_number": "optional lot number",
    "client_name": "optional client name pattern",
    "supplier_name": "optional supplier name pattern",
    "status": "optional status filter",
    "type": "summary|detail|list|balance|activity"
  },
  "intent": "brief description of what user wants",
  "activityInsight": "any relevant insight from recent activities"
}

Examples:
- "What happened today?" → entities: ["activities"], filters: {type: "activity"}, activityInsight: "Summarizing today's changes"
- "Who made changes to LOT 881?" → entities: ["activities", "shipments"], filters: {lot_number: "881", type: "activity"}
- "Show me recent updates" → entities: ["activities"], filters: {type: "list"}
- "What's the status of WINTEX shipments?" → entities: ["shipments", "suppliers"], filters: {supplier_name: "WINTEX", type: "summary"}`;

    // Helper function for time ago
    function getTimeAgo(date: Date): string {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    }

    const aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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

    // Query activities
    if (entities.includes('activities')) {
      let activityQuery = supabase.from('activity_logs').select('*');
      
      if (filters.lot_number) {
        activityQuery = activityQuery.ilike('entity_name', `%${filters.lot_number}%`);
      }
      
      const { data: activities, error } = await activityQuery
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) console.error('Activities query error:', error);
      results.activities = activities || [];
    }

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

    // Add recent activity summary to results
    results.recentActivitySummary = {
      totalActions: recentActivity.length,
      lastActivity: recentActivity[0] || null,
      activityBreakdown: recentActivity.reduce((acc: Record<string, number>, a) => {
        acc[a.action_type] = (acc[a.action_type] || 0) + 1;
        return acc;
      }, {}),
    };

    // Format response using AI
    const formatPrompt = `Format this data into a clear, concise response. Use emojis for visual appeal. Be brief but informative.

Query: "${query}"
Intent: ${parsedIntent?.intent || 'general query'}
Activity Insight: ${parsedIntent?.activityInsight || 'none'}

Data:
${JSON.stringify(results, null, 2)}

Format rules:
- Use 📦 for shipments, 👤 for clients, 🏭 for suppliers, 💰 for payments/money
- Use 📝 for activities/changes, ✏️ for updates, ➕ for creates, 🗑️ for deletes
- Include key numbers (totals, balances, counts)
- Use currency formatting (R for ZAR, $ for USD, € for EUR)
- Mention who made changes when relevant (from user_email)
- Keep response under 600 characters for readability
- If no data found, say so clearly`;

    const formatResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that formats freight forwarding data and activity logs into clear, readable summaries. You are aware of all system activities and can provide insights on what has been happening.' },
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
