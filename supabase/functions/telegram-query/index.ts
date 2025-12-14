import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are an AI assistant for Favorite Logistics, a freight forwarding company. You have FULL access to read AND write to the database.

## Your Capabilities:
1. **QUERY** - Fetch and display data about shipments, clients, suppliers, payments, documents
2. **UPDATE** - Modify existing records (shipments, costs, payments, supplier ledger)
3. **CREATE** - Add new shipments, suppliers, clients, payments, ledger entries
4. **RETRIEVE** - Get document files and information

## Response Format:
You MUST respond with valid JSON in this exact format:
{
  "action": "query" | "update" | "create" | "retrieve" | "help",
  "entity": "shipment" | "shipment_costs" | "supplier" | "client" | "payment" | "supplier_ledger" | "document",
  "identifier": { "lot_number": "881" } or { "id": "uuid" } or { "name": "WINTEX" },
  "data": { /* fields to update or create */ },
  "query": { /* query parameters for fetching data */ },
  "message": "Human readable confirmation/result message with emojis"
}

## Example Commands and Responses:

### Query Examples:
User: "Show me LOT 881"
Response: { "action": "query", "entity": "shipment", "identifier": { "lot_number": "881" }, "message": "Fetching details for LOT 881..." }

User: "What's WINTEX balance?"
Response: { "action": "query", "entity": "supplier", "identifier": { "name": "WINTEX" }, "message": "Checking WINTEX balance..." }

User: "List pending shipments"
Response: { "action": "query", "entity": "shipment", "query": { "status": "pending" }, "message": "Fetching pending shipments..." }

### Update Examples:
User: "Update freight cost for LOT 881 to $5000"
Response: { "action": "update", "entity": "shipment_costs", "identifier": { "lot_number": "881" }, "data": { "freight_cost": 5000 }, "message": "✅ Updated freight cost for LOT 881 to $5,000" }

User: "Mark LOT 882 as in-transit"
Response: { "action": "update", "entity": "shipment", "identifier": { "lot_number": "882" }, "data": { "status": "in-transit" }, "message": "✅ LOT 882 status updated to in-transit" }

User: "Set client invoice for LOT 883 to R250000"
Response: { "action": "update", "entity": "shipment_costs", "identifier": { "lot_number": "883" }, "data": { "client_invoice_zar": 250000 }, "message": "✅ Client invoice for LOT 883 set to R250,000" }

### Create Examples:
User: "Create new shipment LOT 885 from WINTEX to MJ Oils"
Response: { "action": "create", "entity": "shipment", "data": { "lot_number": "885", "supplier_name": "WINTEX", "client_name": "MJ Oils" }, "message": "✅ Created shipment LOT 885" }

User: "Add payment of $10000 for WINTEX for LOT 881"
Response: { "action": "create", "entity": "supplier_ledger", "data": { "supplier_name": "WINTEX", "lot_number": "881", "amount": 10000, "ledger_type": "credit", "description": "Payment" }, "message": "✅ Recorded $10,000 payment to WINTEX for LOT 881" }

### Document Examples:
User: "Get documents for LOT 881"
Response: { "action": "retrieve", "entity": "document", "identifier": { "lot_number": "881" }, "message": "📄 Fetching documents for LOT 881..." }

## Field Reference:
- **shipments**: lot_number, status (pending/in-transit/documents-submitted/completed), eta, commodity, notes, document_submitted, telex_released
- **shipment_costs**: supplier_cost, freight_cost, clearing_cost, transport_cost, client_invoice_zar, fx_spot_rate, fx_applied_rate, bank_charges, source_currency (USD/EUR/ZAR)
- **suppliers**: name, currency, current_balance, contact_person, email, phone
- **clients**: name, contact_person, email, phone, address
- **supplier_ledger**: amount, ledger_type (debit/credit), description, transaction_date, invoice_number
- **payment_schedule**: amount_foreign, currency, fx_rate, payment_date, status (pending/completed)

## Important Rules:
1. ALWAYS respond with valid JSON
2. Use appropriate emojis in messages
3. For currency, maintain proper formatting ($ for USD, R for ZAR, € for EUR)
4. When updating costs, the profit calculations are automatic (database trigger)
5. When creating ledger entries, supplier balance updates automatically
6. If user intent is unclear, ask for clarification with action: "help"

## Current Database Context:
You have access to: shipments, shipment_costs, suppliers, clients, supplier_ledger, payment_schedule, uploaded_documents, bank_accounts tables.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TELEGRAM_BOT_TOKEN || !DEEPSEEK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    console.log('Received Telegram webhook:', JSON.stringify(body));

    const message = body.message;
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = message.chat.id;
    const userMessage = message.text;

    // Send "typing" indicator
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });

    // Fetch current database context for AI
    const dbContext = await fetchDatabaseContext(supabase);

    // Call AI to interpret the command
    const aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Current database state:\n${JSON.stringify(dbContext, null, 2)}\n\nUser command: "${userMessage}"` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', errorText);
      
      if (aiResponse.status === 429) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, "⚠️ Rate limit exceeded. Please try again in a moment.");
      } else if (aiResponse.status === 402) {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, "⚠️ AI usage limit reached. Please contact support.");
      } else {
        await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, "❌ AI service temporarily unavailable. Please try again.");
      }
      
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;
    
    console.log('AI response:', aiContent);

    // Parse AI response
    let actionPlan;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiContent];
      const jsonStr = jsonMatch[1] || aiContent;
      actionPlan = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // AI gave a natural response, send it directly
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, aiContent || "I couldn't understand that request. Please try again.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute the action plan
    const result = await executeAction(supabase, actionPlan, dbContext, chatId, TELEGRAM_BOT_TOKEN);
    
    // Log the action
    await logAction(supabase, userMessage, actionPlan, result);

    // Send response to user
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, result.message);

    return new Response(JSON.stringify({ ok: true, result }), {
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

// Fetch database context for AI
async function fetchDatabaseContext(supabase: any) {
  const [shipments, suppliers, clients, pendingPayments] = await Promise.all([
    supabase.from('v_shipments_full').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('clients').select('*').order('name'),
    supabase.from('v_pending_payments').select('*').order('payment_date'),
  ]);

  return {
    recentShipments: shipments.data?.map((s: any) => ({
      lot_number: s.lot_number,
      status: s.status,
      supplier: s.supplier_name,
      client: s.client_name,
      eta: s.eta,
      profit: s.net_profit_zar,
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
    pendingPayments: pendingPayments.data?.slice(0, 10) || [],
  };
}

// Execute the action plan from AI
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
          message: plan.message || `👋 <b>Favorite Logistics Assistant</b>

I can help you with:

📦 <b>Shipments</b>
• "Show LOT 881"
• "List pending shipments"
• "Update LOT 882 status to in-transit"

💰 <b>Costs & Invoices</b>
• "Set freight cost for LOT 881 to $5000"
• "Update client invoice for LOT 883 to R250000"

🏭 <b>Suppliers</b>
• "What's WINTEX balance?"
• "Add payment of $10000 to WINTEX for LOT 881"

👥 <b>Clients</b>
• "Show MJ Oils shipments"

📄 <b>Documents</b>
• "Get documents for LOT 881"

Just type your request naturally!`,
        };
    }
  } catch (error) {
    console.error('Action execution error:', error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Handle query actions
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

      const formatted = result.data.map((s: any) => formatShipment(s)).join('\n\n');
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
      
      // Get recent ledger entries
      const { data: ledger } = await supabase
        .from('supplier_ledger')
        .select('*, shipments(lot_number)')
        .eq('supplier_id', supplier.id)
        .order('transaction_date', { ascending: false })
        .limit(5);

      // Get active shipments
      const { data: shipments } = await supabase
        .from('v_shipments_full')
        .select('*')
        .ilike('supplier_name', `%${supplier.name}%`)
        .neq('status', 'completed')
        .limit(5);

      const balanceColor = supplier.current_balance > 0 ? '🔴' : supplier.current_balance < 0 ? '🟢' : '⚪';
      
      let message = `🏭 <b>${supplier.name}</b>\n`;
      message += `💵 Currency: ${supplier.currency}\n`;
      message += `${balanceColor} Balance: ${supplier.currency} ${Number(supplier.current_balance).toLocaleString()}\n`;
      
      if (shipments && shipments.length > 0) {
        message += `\n📦 <b>Active Shipments:</b>\n`;
        message += shipments.map((s: any) => `• LOT ${s.lot_number} - ${s.status}`).join('\n');
      }
      
      if (ledger && ledger.length > 0) {
        message += `\n\n📒 <b>Recent Transactions:</b>\n`;
        message += ledger.map((l: any) => {
          const type = l.ledger_type === 'debit' ? '📤' : '📥';
          return `${type} ${supplier.currency} ${Number(l.amount).toLocaleString()} - ${l.description || 'N/A'}`;
        }).join('\n');
      }

      return { success: true, message, data: supplier };
    }

    case 'client': {
      const clientName = identifier?.name || '';
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', `%${clientName}%`)
        .limit(1);

      if (error) throw error;
      if (!clients || clients.length === 0) {
        return { success: true, message: `❌ Client "${clientName}" not found.` };
      }

      const client = clients[0];
      
      // Get shipments for this client
      const { data: shipments } = await supabase
        .from('v_shipments_full')
        .select('*')
        .ilike('client_name', `%${client.name}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      const activeCount = shipments?.filter((s: any) => s.status !== 'completed').length || 0;
      const totalRevenue = shipments?.reduce((sum: number, s: any) => sum + (Number(s.client_invoice_zar) || 0), 0) || 0;
      const totalProfit = shipments?.reduce((sum: number, s: any) => sum + (Number(s.net_profit_zar) || 0), 0) || 0;

      let message = `👤 <b>${client.name}</b>\n`;
      if (client.contact_person) message += `📇 ${client.contact_person}\n`;
      if (client.email) message += `📧 ${client.email}\n`;
      if (client.phone) message += `📱 ${client.phone}\n`;
      
      message += `\n📊 <b>Summary:</b>\n`;
      message += `• Active Shipments: ${activeCount}\n`;
      message += `• Total Shipments: ${shipments?.length || 0}\n`;
      message += `• Total Revenue: R${totalRevenue.toLocaleString()}\n`;
      message += `• Total Profit: R${totalProfit.toLocaleString()}\n`;

      if (shipments && shipments.length > 0) {
        message += `\n📦 <b>Recent Shipments:</b>\n`;
        message += shipments.slice(0, 5).map((s: any) => 
          `• LOT ${s.lot_number} - ${getStatusEmoji(s.status)} ${s.status}`
        ).join('\n');
      }

      return { success: true, message, data: client };
    }

    default:
      return { success: false, message: `❌ Unknown entity type: ${entity}` };
  }
}

// Handle update actions
async function handleUpdate(supabase: any, entity: string, identifier: any, data: any) {
  switch (entity) {
    case 'shipment': {
      const lotNumber = identifier?.lot_number;
      if (!lotNumber) throw new Error('LOT number required for update');

      // Find the shipment
      const { data: shipments, error: findError } = await supabase
        .from('shipments')
        .select('id, lot_number')
        .ilike('lot_number', `%${lotNumber}%`)
        .limit(1);

      if (findError) throw findError;
      if (!shipments || shipments.length === 0) {
        return { success: false, message: `❌ Shipment LOT ${lotNumber} not found.` };
      }

      const shipment = shipments[0];

      // Update shipment
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', shipment.id);

      if (updateError) throw updateError;

      const updates = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(', ');
      return { 
        success: true, 
        message: `✅ <b>LOT ${shipment.lot_number}</b> updated\n${updates}` 
      };
    }

    case 'shipment_costs': {
      const lotNumber = identifier?.lot_number;
      if (!lotNumber) throw new Error('LOT number required for update');

      // Find the shipment
      const { data: shipments, error: findError } = await supabase
        .from('shipments')
        .select('id, lot_number')
        .ilike('lot_number', `%${lotNumber}%`)
        .limit(1);

      if (findError) throw findError;
      if (!shipments || shipments.length === 0) {
        return { success: false, message: `❌ Shipment LOT ${lotNumber} not found.` };
      }

      const shipment = shipments[0];

      // Check if costs record exists
      const { data: existingCosts } = await supabase
        .from('shipment_costs')
        .select('id')
        .eq('shipment_id', shipment.id)
        .limit(1);

      if (existingCosts && existingCosts.length > 0) {
        // Update existing
        const { error: updateError } = await supabase
          .from('shipment_costs')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('shipment_id', shipment.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('shipment_costs')
          .insert({ shipment_id: shipment.id, ...data });

        if (insertError) throw insertError;
      }

      // Fetch updated data with calculated profits
      const { data: updated } = await supabase
        .from('v_shipments_full')
        .select('*')
        .eq('id', shipment.id)
        .single();

      let message = `✅ <b>LOT ${shipment.lot_number}</b> costs updated\n\n`;
      
      if (updated) {
        if (data.supplier_cost) message += `💰 Supplier Cost: $${Number(data.supplier_cost).toLocaleString()}\n`;
        if (data.freight_cost) message += `🚢 Freight: $${Number(data.freight_cost).toLocaleString()}\n`;
        if (data.clearing_cost) message += `📋 Clearing: $${Number(data.clearing_cost).toLocaleString()}\n`;
        if (data.transport_cost) message += `🚚 Transport: $${Number(data.transport_cost).toLocaleString()}\n`;
        if (data.client_invoice_zar) message += `📄 Client Invoice: R${Number(data.client_invoice_zar).toLocaleString()}\n`;
        if (data.fx_applied_rate) message += `💱 FX Rate: ${data.fx_applied_rate}\n`;
        
        if (updated.net_profit_zar) {
          message += `\n📊 <b>Calculated Profit:</b> R${Number(updated.net_profit_zar).toLocaleString()}`;
          if (updated.profit_margin) {
            message += ` (${Number(updated.profit_margin).toFixed(1)}%)`;
          }
        }
      }

      return { success: true, message };
    }

    default:
      return { success: false, message: `❌ Cannot update entity type: ${entity}` };
  }
}

// Handle create actions
async function handleCreate(supabase: any, entity: string, data: any, dbContext: any) {
  switch (entity) {
    case 'shipment': {
      // Find supplier ID by name
      let supplierId = null;
      if (data.supplier_name) {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${data.supplier_name}%`)
          .limit(1);
        supplierId = suppliers?.[0]?.id;
      }

      // Find client ID by name
      let clientId = null;
      if (data.client_name) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id')
          .ilike('name', `%${data.client_name}%`)
          .limit(1);
        clientId = clients?.[0]?.id;
      }

      const { error } = await supabase
        .from('shipments')
        .insert({
          lot_number: data.lot_number,
          supplier_id: supplierId,
          client_id: clientId,
          status: data.status || 'pending',
          commodity: data.commodity,
          eta: data.eta,
          notes: data.notes,
        });

      if (error) throw error;

      return { 
        success: true, 
        message: `✅ Created shipment <b>LOT ${data.lot_number}</b>\n🏭 Supplier: ${data.supplier_name || 'N/A'}\n👤 Client: ${data.client_name || 'N/A'}` 
      };
    }

    case 'supplier': {
      const { error } = await supabase
        .from('suppliers')
        .insert({
          name: data.name,
          currency: data.currency || 'USD',
          contact_person: data.contact_person,
          email: data.email,
          phone: data.phone,
        });

      if (error) throw error;

      return { success: true, message: `✅ Created supplier <b>${data.name}</b>` };
    }

    case 'client': {
      const { error } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          contact_person: data.contact_person,
          email: data.email,
          phone: data.phone,
          address: data.address,
        });

      if (error) throw error;

      return { success: true, message: `✅ Created client <b>${data.name}</b>` };
    }

    case 'supplier_ledger': {
      // Find supplier
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, currency')
        .ilike('name', `%${data.supplier_name}%`)
        .limit(1);

      if (!suppliers || suppliers.length === 0) {
        return { success: false, message: `❌ Supplier "${data.supplier_name}" not found.` };
      }

      const supplier = suppliers[0];

      // Find shipment if lot_number provided
      let shipmentId = null;
      if (data.lot_number) {
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id')
          .ilike('lot_number', `%${data.lot_number}%`)
          .limit(1);
        shipmentId = shipments?.[0]?.id;
      }

      const { error } = await supabase
        .from('supplier_ledger')
        .insert({
          supplier_id: supplier.id,
          shipment_id: shipmentId,
          ledger_type: data.ledger_type || 'credit',
          amount: data.amount,
          description: data.description || (data.ledger_type === 'credit' ? 'Payment' : 'Invoice'),
          transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
          invoice_number: data.invoice_number,
        });

      if (error) throw error;

      const typeEmoji = data.ledger_type === 'credit' ? '📥' : '📤';
      return { 
        success: true, 
        message: `${typeEmoji} Recorded ${supplier.currency} ${Number(data.amount).toLocaleString()} ${data.ledger_type || 'credit'} for <b>${supplier.name}</b>${data.lot_number ? ` (LOT ${data.lot_number})` : ''}` 
      };
    }

    case 'payment': {
      // Find supplier
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .ilike('name', `%${data.supplier_name}%`)
        .limit(1);

      if (!suppliers || suppliers.length === 0) {
        return { success: false, message: `❌ Supplier "${data.supplier_name}" not found.` };
      }

      const supplier = suppliers[0];

      // Find shipment if lot_number provided
      let shipmentId = null;
      if (data.lot_number) {
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id')
          .ilike('lot_number', `%${data.lot_number}%`)
          .limit(1);
        shipmentId = shipments?.[0]?.id;
      }

      const { error } = await supabase
        .from('payment_schedule')
        .insert({
          supplier_id: supplier.id,
          shipment_id: shipmentId,
          amount_foreign: data.amount_foreign || data.amount,
          currency: data.currency || 'USD',
          fx_rate: data.fx_rate || 0,
          payment_date: data.payment_date || new Date().toISOString().split('T')[0],
          status: data.status || 'pending',
          notes: data.notes,
        });

      if (error) throw error;

      return { 
        success: true, 
        message: `✅ Scheduled payment of ${data.currency || 'USD'} ${Number(data.amount_foreign || data.amount).toLocaleString()} to <b>${supplier.name}</b>` 
      };
    }

    default:
      return { success: false, message: `❌ Cannot create entity type: ${entity}` };
  }
}

// Handle document retrieval and sending
async function handleRetrieve(supabase: any, entity: string, identifier: any, chatId?: number, telegramToken?: string) {
  if (entity !== 'document') {
    return { success: false, message: `❌ Can only retrieve documents.` };
  }

  const lotNumber = identifier?.lot_number;
  
  const query = supabase.from('uploaded_documents').select('*');
  
  if (lotNumber) {
    query.ilike('lot_number', `%${lotNumber}%`);
  }
  
  query.order('uploaded_at', { ascending: false }).limit(10);
  
  const { data: documents, error } = await query;

  if (error) throw error;
  if (!documents || documents.length === 0) {
    return { success: true, message: `❌ No documents found${lotNumber ? ` for LOT ${lotNumber}` : ''}.` };
  }

  // If we have chatId and token, send the actual files
  const sentFiles: string[] = [];
  const failedFiles: string[] = [];

  if (chatId && telegramToken) {
    for (const doc of documents) {
      if (doc.file_path) {
        try {
          // Generate a signed URL for the file (valid for 1 hour)
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('documents')
            .createSignedUrl(doc.file_path, 3600);

          if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error('Failed to get signed URL:', signedUrlError);
            failedFiles.push(doc.file_name);
            continue;
          }

          // Download the file
          const fileResponse = await fetch(signedUrlData.signedUrl);
          if (!fileResponse.ok) {
            console.error('Failed to download file:', fileResponse.status);
            failedFiles.push(doc.file_name);
            continue;
          }

          const fileBlob = await fileResponse.blob();
          
          // Send file via Telegram
          const formData = new FormData();
          formData.append('chat_id', chatId.toString());
          formData.append('document', fileBlob, doc.file_name);
          formData.append('caption', `📎 ${doc.file_name}\n${doc.document_type ? `Type: ${doc.document_type}` : ''}${doc.lot_number ? `\nLOT: ${doc.lot_number}` : ''}`);

          const telegramResponse = await fetch(
            `https://api.telegram.org/bot${telegramToken}/sendDocument`,
            { method: 'POST', body: formData }
          );

          if (telegramResponse.ok) {
            sentFiles.push(doc.file_name);
          } else {
            const errorText = await telegramResponse.text();
            console.error('Telegram sendDocument failed:', errorText);
            failedFiles.push(doc.file_name);
          }
        } catch (fileError) {
          console.error('Error sending file:', fileError);
          failedFiles.push(doc.file_name);
        }
      } else {
        failedFiles.push(doc.file_name);
      }
    }
  }

  // Build response message
  let message = '';
  
  if (sentFiles.length > 0) {
    message = `✅ Sent ${sentFiles.length} document${sentFiles.length > 1 ? 's' : ''}${lotNumber ? ` for LOT ${lotNumber}` : ''}:\n`;
    message += sentFiles.map(f => `📎 ${f}`).join('\n');
  }
  
  if (failedFiles.length > 0) {
    if (message) message += '\n\n';
    message += `⚠️ Could not send ${failedFiles.length} file${failedFiles.length > 1 ? 's' : ''}:\n`;
    message += failedFiles.map(f => `❌ ${f}`).join('\n');
  }

  if (!message) {
    message = `📄 <b>Documents${lotNumber ? ` for LOT ${lotNumber}` : ''}</b>\n\n`;
    for (const doc of documents) {
      message += `📎 <b>${doc.file_name}</b>\n`;
      message += `   Type: ${doc.document_type || 'Unknown'}\n`;
      if (doc.lot_number) message += `   LOT: ${doc.lot_number}\n`;
      if (doc.supplier_name) message += `   Supplier: ${doc.supplier_name}\n`;
      if (doc.summary) message += `   Summary: ${doc.summary.substring(0, 100)}...\n`;
      message += `   Uploaded: ${new Date(doc.uploaded_at).toLocaleDateString()}\n\n`;
    }
  }

  return { success: true, message, data: documents, sentFiles, failedFiles };
}

// Log action to automation_logs
async function logAction(supabase: any, userMessage: string, actionPlan: any, result: any) {
  try {
    await supabase.from('automation_logs').insert({
      source: 'telegram',
      action: actionPlan.action || 'query',
      lot_number: actionPlan.identifier?.lot_number || null,
      request_body: { message: userMessage, plan: actionPlan },
      response: result,
      success: result.success !== false,
      error: result.success === false ? result.message : null,
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

// Send message via Telegram
async function sendTelegramMessage(token: string, chatId: number, text: string) {
  // Telegram has a 4096 character limit, truncate if needed
  const truncatedText = text.length > 4000 ? text.substring(0, 4000) + '\n\n... (truncated)' : text;
  
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: truncatedText,
      parse_mode: 'HTML',
    }),
  });
  
  if (!response.ok) {
    console.error('Failed to send Telegram message:', await response.text());
  }
  return response;
}

// Format shipment for display
function formatShipment(s: any): string {
  let msg = `📦 <b>LOT ${s.lot_number}</b>\n`;
  msg += `${getStatusEmoji(s.status)} Status: ${s.status}\n`;
  if (s.supplier_name) msg += `🏭 Supplier: ${s.supplier_name}\n`;
  if (s.client_name) msg += `👤 Client: ${s.client_name}\n`;
  if (s.commodity) msg += `📋 Commodity: ${s.commodity}\n`;
  if (s.eta) msg += `📅 ETA: ${s.eta}\n`;
  if (s.total_foreign) msg += `💵 Total Cost: $${Number(s.total_foreign).toLocaleString()}\n`;
  if (s.client_invoice_zar) msg += `📄 Invoice: R${Number(s.client_invoice_zar).toLocaleString()}\n`;
  if (s.net_profit_zar) {
    msg += `💰 Profit: R${Number(s.net_profit_zar).toLocaleString()}`;
    if (s.profit_margin) msg += ` (${Number(s.profit_margin).toFixed(1)}%)`;
    msg += '\n';
  }
  return msg;
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
