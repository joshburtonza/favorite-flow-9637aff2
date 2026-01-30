import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// FLAIR (Favorite Logistics AI Resource) v2.0
// Telegram/WhatsApp Interface
// ============================================

const FLAIR_TELEGRAM_PROMPT = `You are **FLAIR** (Favorite Logistics AI Resource) - the intelligent operations manager for Favorite Logistics, a South African import freight forwarding company owned by Mo Irshad.

You are NOT a chatbot. You ARE the primary interface to the entire business operations system via Telegram. You have complete authority to query, create, update, and manage all business data.

## YOUR PERSONALITY:
- Professional but conversational
- Proactive - anticipate what Mo needs next
- Precise with numbers - margins matter
- Use emojis for clarity in Telegram
- Keep responses concise but complete

## THE BUSINESS:
- Import freight forwarding: overseas suppliers → SA clients
- Suppliers paid in USD/EUR, clients invoiced in ZAR
- Each shipment has a unique LOT number
- Profit = Client Invoice - (Supplier + Freight + Clearing + Transport costs) + FX Commission

## KNOWN ENTITIES:
**Suppliers:** WINTEX, HUBEI PUFANG, HAMZA TOWELS, NINGBO CROSSLEAP, AMAGGI, COFCO
**Clients:** ADNAN JOOSAB, MJ OILS, MOTALA, CHEVAL SHOES, FOOT FOCUS, FOOTWORKS
**Clearing Agents:** Sanjith (primary), Shane, Kara, Mojo
**FX Providers:** Financiere Suisse (primary), FNB, Obeid

## PROFIT CALCULATION:
1. Total Foreign = supplier + freight + clearing + transport
2. Total ZAR = Total Foreign × FX Rate
3. Gross Profit = Client Invoice - Total ZAR
4. FX Commission = Total ZAR × 1.4%
5. Net Profit = Gross + FX Commission - Bank Charges
6. Margin = (Net Profit / Client Invoice) × 100%

## TELEGRAM FORMATTING:
Use simple text with emojis:

📦 LOT 881 DETAILS
├─ Status: IN-TRANSIT
├─ Route: WINTEX → ADNAN
├─ ETA: Jan 25, 2026
└─ Margin: 19.03% ✅

💰 COSTS (USD)
├─ Supplier: $105,000
├─ Freight: $1,200
└─ Total: $106,383

## RESPONSE FORMAT:
You MUST respond with valid JSON:
{
  "action": "query" | "update" | "create" | "retrieve" | "help",
  "entity": "shipment" | "shipment_costs" | "supplier" | "client" | "payment" | "supplier_ledger" | "document",
  "identifier": { "lot_number": "881" } or { "name": "WINTEX" },
  "data": { /* fields to update/create */ },
  "query": { /* query parameters */ },
  "message": "📦 Formatted Telegram message with emojis"
}

## NATURAL LANGUAGE PATTERNS:
| User Says | Action |
|-----------|--------|
| "Show LOT 881" | Query shipment |
| "What's WINTEX balance?" | Query supplier |
| "881 docs are in" | Update document_submitted = true |
| "LOT 192 is in transit" | Update status = in-transit |
| "Mark 883 telex released" | Update telex_released = true |
| "Pay Wintex 50k" | Create payment |

## FIELD REFERENCE:
- **shipments**: lot_number, status (pending/in-transit/documents-submitted/completed), eta, commodity, document_submitted, telex_released
- **shipment_costs**: supplier_cost, freight_cost, clearing_cost, transport_cost, client_invoice_zar, fx_applied_rate
- **suppliers**: name, currency, current_balance
- **supplier_ledger**: amount, ledger_type (debit/credit), description

## PROACTIVE ALERTS (mention if relevant):
- Supplier balance > $50,000 → ⚠️ Warning
- ETA < 3 days, no telex → 🚨 Urgent
- Profit margin < 10% → ⚠️ Low margin
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TELEGRAM_BOT_TOKEN || !LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    console.log('FLAIR Telegram received:', JSON.stringify(body));

    const message = body.message;
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = message.chat.id;
    const userMessage = message.text;

    // Send typing indicator
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });

    // Fetch database context
    const dbContext = await fetchDatabaseContext(supabase);

    // Call FLAIR via Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: FLAIR_TELEGRAM_PROMPT },
          { role: 'user', content: `Current database:\n${JSON.stringify(dbContext, null, 2)}\n\nUser: "${userMessage}"` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('FLAIR AI error:', errorText);
      
      if (aiResponse.status === 429) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, "⚠️ Rate limit. Try again in a moment.");
      } else if (aiResponse.status === 402) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, "⚠️ AI credits exhausted.");
      } else {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, "❌ FLAIR temporarily unavailable.");
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    console.log('FLAIR response:', aiContent);

    // Parse response
    let actionPlan;
    try {
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiContent];
      const jsonStr = jsonMatch[1] || aiContent;
      actionPlan = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Parse error:', parseError);
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, aiContent || "I couldn't process that request.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute action
    const result = await executeAction(supabase, actionPlan, dbContext, chatId, TELEGRAM_BOT_TOKEN);
    
    // Log action
    await logAction(supabase, userMessage, actionPlan, result);

    // Send response
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, result.message);

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('FLAIR Telegram error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchDatabaseContext(supabase: any) {
  const [shipments, suppliers, clients, pendingPayments] = await Promise.all([
    supabase.from('v_shipments_full').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('clients').select('*').order('name'),
    supabase.from('v_pending_payments').select('*').order('payment_date').limit(10),
  ]);

  return {
    recentShipments: shipments.data?.map((s: any) => ({
      lot_number: s.lot_number,
      status: s.status,
      supplier: s.supplier_name,
      client: s.client_name,
      eta: s.eta,
      profit: s.net_profit_zar,
      margin: s.profit_margin,
      document_submitted: s.document_submitted,
      telex_released: s.telex_released,
    })) || [],
    suppliers: suppliers.data?.map((s: any) => ({
      name: s.name,
      currency: s.currency,
      balance: s.current_balance,
    })) || [],
    clients: clients.data?.map((c: any) => ({
      name: c.name,
      contact: c.contact_person,
    })) || [],
    pendingPayments: pendingPayments.data || [],
  };
}

async function executeAction(supabase: any, plan: any, dbContext: any, chatId?: number, telegramToken?: string) {
  const { action, entity, identifier, data, query } = plan;

  try {
    switch (action) {
      case 'query':
        return await handleQuery(supabase, entity, identifier, query, dbContext);
      case 'update':
        return await handleUpdate(supabase, entity, identifier, data);
      case 'create':
        return await handleCreate(supabase, entity, data, dbContext);
      case 'retrieve':
        return await handleRetrieve(supabase, entity, identifier, chatId, telegramToken);
      case 'help':
      default:
        return {
          success: true,
          message: plan.message || `👋 <b>FLAIR - Operations Manager</b>

I can help you with:

📦 <b>Shipments</b>
• "Show LOT 881"
• "List pending shipments"
• "881 docs are in"
• "Mark LOT 882 in transit"

💰 <b>Financials</b>
• "What's WINTEX balance?"
• "Total profit this month"

📄 <b>Documents</b>
• "Get docs for LOT 881"

Just type naturally!`,
        };
    }
  } catch (error) {
    console.error('Action error:', error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function handleQuery(supabase: any, entity: string, identifier: any, query: any, dbContext: any) {
  switch (entity) {
    case 'shipment': {
      let result;
      if (identifier?.lot_number) {
        result = await supabase
          .from('v_shipments_full')
          .select('*')
          .ilike('lot_number', `%${identifier.lot_number}%`);
      } else if (query?.status) {
        result = await supabase
          .from('v_shipments_full')
          .select('*')
          .eq('status', query.status)
          .order('eta', { ascending: true });
      } else {
        result = await supabase
          .from('v_shipments_full')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
      }

      if (result.error) throw result.error;
      if (!result.data || result.data.length === 0) {
        return { success: true, message: `❌ No shipments found.` };
      }

      const formatted = result.data.map((s: any) => formatShipmentTelegram(s)).join('\n\n');
      return { success: true, message: formatted, data: result.data };
    }

    case 'supplier': {
      const supplierName = identifier?.name || '';
      const { data: suppliers, error } = await supabase
        .from('suppliers')
        .select('*')
        .ilike('name', `%${supplierName}%`)
        .limit(1);

      if (error) throw error;
      if (!suppliers || suppliers.length === 0) {
        return { success: true, message: `❌ Supplier "${supplierName}" not found.` };
      }

      const supplier = suppliers[0];
      const balanceWarning = supplier.current_balance > 50000 ? ' ⚠️ HIGH' : '';
      
      let message = `🏭 <b>${supplier.name}</b>\n`;
      message += `💵 Currency: ${supplier.currency}\n`;
      message += `💰 Balance: ${supplier.currency} ${Number(supplier.current_balance).toLocaleString()}${balanceWarning}\n`;

      // Get active shipments
      const { data: shipments } = await supabase
        .from('v_shipments_full')
        .select('*')
        .ilike('supplier_name', `%${supplier.name}%`)
        .neq('status', 'completed')
        .limit(5);

      if (shipments && shipments.length > 0) {
        message += `\n📦 <b>Active Shipments:</b>\n`;
        message += shipments.map((s: any) => `├─ LOT ${s.lot_number}: ${getStatusEmoji(s.status)} ${s.status}`).join('\n');
      }

      return { success: true, message, data: supplier };
    }

    default:
      return { success: false, message: `❌ Unknown entity: ${entity}` };
  }
}

async function handleUpdate(supabase: any, entity: string, identifier: any, data: any) {
  switch (entity) {
    case 'shipment': {
      const lotNumber = identifier?.lot_number;
      if (!lotNumber) throw new Error('LOT number required');

      const { data: shipments, error: findError } = await supabase
        .from('shipments')
        .select('id, lot_number, status')
        .ilike('lot_number', `%${lotNumber}%`)
        .limit(1);

      if (findError) throw findError;
      if (!shipments?.length) {
        return { success: false, message: `❌ LOT ${lotNumber} not found.` };
      }

      const shipment = shipments[0];
      const oldStatus = shipment.status;

      const { error: updateError } = await supabase
        .from('shipments')
        .update({ ...data, updated_at: new Date().toISOString(), last_updated_by: 'flair_telegram' })
        .eq('id', shipment.id);

      if (updateError) throw updateError;

      let message = `✅ <b>LOT ${shipment.lot_number} Updated</b>\n`;
      if (data.status) message += `📊 Status: ${oldStatus} → ${data.status}\n`;
      if (data.document_submitted) message += `📄 Documents: Submitted ✅\n`;
      if (data.telex_released) message += `📨 Telex: Released ✅\n`;
      if (data.eta) message += `⏰ ETA: ${data.eta}\n`;

      return { success: true, message, data: { shipment_id: shipment.id, updates: data } };
    }

    case 'shipment_costs': {
      const lotNumber = identifier?.lot_number;
      if (!lotNumber) throw new Error('LOT number required');

      const { data: shipments } = await supabase
        .from('shipments')
        .select('id, lot_number')
        .ilike('lot_number', `%${lotNumber}%`)
        .limit(1);

      if (!shipments?.length) {
        return { success: false, message: `❌ LOT ${lotNumber} not found.` };
      }

      const shipmentId = shipments[0].id;

      const { data: existingCosts } = await supabase
        .from('shipment_costs')
        .select('id')
        .eq('shipment_id', shipmentId)
        .limit(1);

      if (existingCosts?.length) {
        await supabase.from('shipment_costs').update(data).eq('shipment_id', shipmentId);
      } else {
        await supabase.from('shipment_costs').insert({ shipment_id: shipmentId, ...data });
      }

      let message = `✅ <b>LOT ${lotNumber} Costs Updated</b>\n`;
      if (data.supplier_cost) message += `├─ Supplier: $${data.supplier_cost.toLocaleString()}\n`;
      if (data.freight_cost) message += `├─ Freight: $${data.freight_cost.toLocaleString()}\n`;
      if (data.clearing_cost) message += `├─ Clearing: $${data.clearing_cost.toLocaleString()}\n`;
      if (data.transport_cost) message += `├─ Transport: $${data.transport_cost.toLocaleString()}\n`;
      if (data.client_invoice_zar) message += `└─ Client Invoice: R${data.client_invoice_zar.toLocaleString()}\n`;

      return { success: true, message };
    }

    default:
      return { success: false, message: `❌ Cannot update: ${entity}` };
  }
}

async function handleCreate(supabase: any, entity: string, data: any, dbContext: any) {
  switch (entity) {
    case 'shipment': {
      // Find supplier and client IDs
      let supplierId = null;
      let clientId = null;

      if (data.supplier_name) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${data.supplier_name}%`)
          .limit(1);
        if (suppliers?.length) supplierId = suppliers[0].id;
      }

      if (data.client_name) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .ilike('name', `%${data.client_name}%`)
          .limit(1);
        if (clients?.length) clientId = clients[0].id;
      }

      const { error } = await supabase.from('shipments').insert({
        lot_number: data.lot_number,
        supplier_id: supplierId,
        client_id: clientId,
        commodity: data.commodity,
        eta: data.eta,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      return {
        success: true,
        message: `✅ <b>New Shipment Created</b>

📦 LOT ${data.lot_number}
├─ Supplier: ${data.supplier_name || 'TBD'}
├─ Client: ${data.client_name || 'TBD'}
├─ Commodity: ${data.commodity || 'TBD'}
└─ ETA: ${data.eta || 'TBD'}`,
      };
    }

    case 'supplier_ledger': {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, currency')
        .ilike('name', `%${data.supplier_name}%`)
        .limit(1);

      if (!suppliers?.length) {
        return { success: false, message: `❌ Supplier "${data.supplier_name}" not found.` };
      }

      const supplier = suppliers[0];
      let shipmentId = null;

      if (data.lot_number) {
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id')
          .ilike('lot_number', `%${data.lot_number}%`)
          .limit(1);
        if (shipments?.length) shipmentId = shipments[0].id;
      }

      await supabase.from('supplier_ledger').insert({
        supplier_id: supplier.id,
        shipment_id: shipmentId,
        ledger_type: data.ledger_type || 'credit',
        amount: data.amount,
        description: data.description || 'Payment',
        transaction_date: new Date().toISOString().split('T')[0],
      });

      const emoji = data.ledger_type === 'debit' ? '📤' : '📥';
      return {
        success: true,
        message: `${emoji} <b>Ledger Entry Added</b>

├─ Supplier: ${supplier.name}
├─ Amount: ${supplier.currency} ${data.amount.toLocaleString()}
├─ Type: ${data.ledger_type || 'credit'}
└─ LOT: ${data.lot_number || 'N/A'}`,
      };
    }

    default:
      return { success: false, message: `❌ Cannot create: ${entity}` };
  }
}

async function handleRetrieve(supabase: any, entity: string, identifier: any, chatId?: number, telegramToken?: string) {
  if (entity === 'document' && identifier?.lot_number) {
    const { data: documents } = await supabase
      .from('uploaded_documents')
      .select('*')
      .ilike('lot_number', `%${identifier.lot_number}%`)
      .order('uploaded_at', { ascending: false });

    if (!documents?.length) {
      return { success: true, message: `📄 No documents found for LOT ${identifier.lot_number}` };
    }

    let message = `📄 <b>Documents for LOT ${identifier.lot_number}</b>\n\n`;
    documents.forEach((doc: any, i: number) => {
      message += `${i + 1}. ${doc.file_name}\n`;
      message += `   Type: ${doc.ai_classification || doc.document_type || 'Unknown'}\n`;
    });

    return { success: true, message, data: documents };
  }

  return { success: false, message: '❌ Invalid retrieve request' };
}

function formatShipmentTelegram(s: any): string {
  const marginEmoji = (s.profit_margin || 0) >= 15 ? '✅' : (s.profit_margin || 0) >= 10 ? '⚠️' : '❌';
  
  let msg = `📦 <b>LOT ${s.lot_number}</b>\n`;
  msg += `├─ Status: ${getStatusEmoji(s.status)} ${s.status}\n`;
  msg += `├─ Route: ${s.supplier_name || '?'} → ${s.client_name || '?'}\n`;
  if (s.commodity) msg += `├─ Commodity: ${s.commodity}\n`;
  if (s.eta) msg += `├─ ETA: ${s.eta}\n`;
  if (s.net_profit_zar) msg += `├─ Profit: R${Number(s.net_profit_zar).toLocaleString()}\n`;
  if (s.profit_margin) msg += `└─ Margin: ${s.profit_margin.toFixed(1)}% ${marginEmoji}\n`;
  
  return msg;
}

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    'pending': '⏳',
    'in-transit': '🚢',
    'documents-submitted': '📄',
    'completed': '✅',
  };
  return emojis[status] || '📦';
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  });
}

async function logAction(supabase: any, userMessage: string, actionPlan: any, result: any) {
  try {
    await supabase.from('automation_logs').insert({
      source: 'flair_telegram',
      action: actionPlan.action || 'unknown',
      lot_number: actionPlan.identifier?.lot_number || null,
      request_body: { user_message: userMessage, action_plan: actionPlan },
      response: result,
      success: result.success,
    });
  } catch (error) {
    console.error('Log error:', error);
  }
}
