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
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TELEGRAM_BOT_TOKEN || !LOVABLE_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    const body = await req.json();
    console.log('Received Telegram webhook:', JSON.stringify(body));

    // Handle Telegram webhook
    const message = body.message;
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = message.chat.id;
    const userMessage = message.text.toLowerCase();

    // Check if it's an update query
    if (!userMessage.includes('update me on') && !userMessage.includes('status of')) {
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
        "👋 Send me a message like:\n• 'Update me on MJ Trading'\n• 'Update me on LOT 881'\n• 'Status of WINTEX'");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the query term
    const queryTerm = userMessage
      .replace('update me on', '')
      .replace('status of', '')
      .trim();

    console.log('Query term:', queryTerm);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch relevant data based on query
    let contextData: any = null;
    let queryType = '';

    // Check if it's a LOT number query
    if (queryTerm.toLowerCase().startsWith('lot') || /^\d+$/.test(queryTerm)) {
      queryType = 'shipment';
      const lotNumber = queryTerm.toUpperCase().replace('LOT ', '').replace('LOT', '').trim();
      
      const { data: shipments } = await supabase
        .from('v_shipments_full')
        .select('*')
        .ilike('lot_number', `%${lotNumber}%`)
        .limit(5);
      
      contextData = { shipments, queryTerm: lotNumber };
    } else {
      // Try client first
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', `%${queryTerm}%`)
        .limit(1);

      if (clients && clients.length > 0) {
        queryType = 'client';
        const client = clients[0];
        
        // Get shipments for this client
        const { data: shipments } = await supabase
          .from('v_shipments_full')
          .select('*')
          .ilike('client_name', `%${client.name}%`);

        // Get payment info
        const { data: payments } = await supabase
          .from('v_pending_payments')
          .select('*');

        contextData = { client, shipments, payments: payments?.filter(p => 
          shipments?.some(s => s.lot_number === p.lot_number)
        ) };
      } else {
        // Try supplier
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*')
          .ilike('name', `%${queryTerm}%`)
          .limit(1);

        if (suppliers && suppliers.length > 0) {
          queryType = 'supplier';
          const supplier = suppliers[0];
          
          // Get shipments for this supplier
          const { data: shipments } = await supabase
            .from('v_shipments_full')
            .select('*')
            .ilike('supplier_name', `%${supplier.name}%`);

          // Get ledger entries
          const { data: ledger } = await supabase
            .from('supplier_ledger')
            .select('*')
            .eq('supplier_id', supplier.id)
            .order('transaction_date', { ascending: false })
            .limit(10);

          contextData = { supplier, shipments, ledger };
        }
      }
    }

    if (!contextData) {
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, 
        `❌ No data found for "${queryTerm}". Try a valid client name, supplier name, or LOT number.`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Lovable AI to generate a formatted response
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
            content: `You are a freight forwarding business assistant. Format responses for Telegram with emojis and clear structure.
            
Rules:
- Use appropriate emojis (📦 shipments, 💰 money, 📍 locations, ✅ completed, ⏳ pending, 🚚 in-transit)
- Format currency as ZAR or USD with proper symbols
- Keep responses concise but informative
- Highlight important statuses and deadlines
- For shipments show: lot number, status, ETA, supplier, client, profit if available
- For clients/suppliers show: summary stats, active shipments, balance if applicable`
          },
          {
            role: 'user',
            content: `Query type: ${queryType}
Query term: ${queryTerm}
Data: ${JSON.stringify(contextData, null, 2)}

Generate a formatted Telegram message summarizing this ${queryType} data.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI Gateway error:', await aiResponse.text());
      // Fallback to basic response
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, formatBasicResponse(queryType, contextData));
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const formattedResponse = aiData.choices?.[0]?.message?.content || formatBasicResponse(queryType, contextData);

    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, formattedResponse);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in telegram-query:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });
  
  if (!response.ok) {
    console.error('Failed to send Telegram message:', await response.text());
  }
  return response;
}

function formatBasicResponse(type: string, data: any): string {
  if (type === 'shipment' && data.shipments) {
    const shipments = data.shipments;
    if (shipments.length === 0) return `❌ No shipments found for LOT ${data.queryTerm}`;
    
    return shipments.map((s: any) => 
      `📦 <b>LOT ${s.lot_number}</b>
Status: ${getStatusEmoji(s.status)} ${s.status}
Supplier: ${s.supplier_name || 'N/A'}
Client: ${s.client_name || 'N/A'}
ETA: ${s.eta || 'TBD'}
${s.net_profit_zar ? `💰 Profit: R${Number(s.net_profit_zar).toLocaleString()}` : ''}`
    ).join('\n\n');
  }

  if (type === 'client' && data.client) {
    const { client, shipments } = data;
    const activeCount = shipments?.filter((s: any) => s.status !== 'completed').length || 0;
    const totalRevenue = shipments?.reduce((sum: number, s: any) => sum + (Number(s.client_invoice_zar) || 0), 0) || 0;
    
    return `👤 <b>${client.name}</b>
📧 ${client.email || 'No email'}
📱 ${client.phone || 'No phone'}

📊 <b>Summary:</b>
Active Shipments: ${activeCount}
Total Shipments: ${shipments?.length || 0}
Total Revenue: R${totalRevenue.toLocaleString()}`;
  }

  if (type === 'supplier' && data.supplier) {
    const { supplier, shipments } = data;
    const activeCount = shipments?.filter((s: any) => s.status !== 'completed').length || 0;
    
    return `🏭 <b>${supplier.name}</b>
💵 Currency: ${supplier.currency}
💰 Balance: ${supplier.currency} ${Number(supplier.current_balance).toLocaleString()}

📊 <b>Summary:</b>
Active Shipments: ${activeCount}
Total Shipments: ${shipments?.length || 0}`;
  }

  return '❌ Unable to format response';
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'in-transit': return '🚚';
    case 'documents-submitted': return '📄';
    case 'completed': return '✅';
    default: return '📦';
  }
}
