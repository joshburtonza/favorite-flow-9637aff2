import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// FLAIR ORCHESTRATOR v2.0
// Complete AI-first ERP Interface with Tool Calling
// ============================================

// Tool definitions for function calling
const TOOL_DEFINITIONS = [
  // Shipment Tools
  {
    type: "function",
    function: {
      name: "shipment_create",
      description: "Create a new shipment. Use when user mentions new lot, new order, new shipment from supplier.",
      parameters: {
        type: "object",
        properties: {
          lot_number: { type: "string", description: "LOT number (e.g., '886'). If not provided, auto-generate." },
          supplier_name: { type: "string", description: "Supplier name (e.g., 'WINTEX')" },
          client_name: { type: "string", description: "Client name (e.g., 'ADNAN JOOSAB')" },
          commodity: { type: "string", description: "Type of goods (e.g., 'FABRIC', 'SHOES')" },
          supplier_cost: { type: "number", description: "Cost from supplier in foreign currency" },
          currency: { type: "string", enum: ["USD", "EUR", "CNY"], description: "Currency for costs" },
          eta: { type: "string", description: "Expected arrival date (YYYY-MM-DD)" },
          notes: { type: "string", description: "Additional notes" }
        },
        required: ["supplier_name", "client_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "shipment_query",
      description: "Query shipments. Use for: show/get/find shipment, list shipments, what's the status of, etc.",
      parameters: {
        type: "object",
        properties: {
          lot_number: { type: "string", description: "Specific LOT number to query" },
          supplier_name: { type: "string", description: "Filter by supplier" },
          client_name: { type: "string", description: "Filter by client" },
          status: { type: "string", enum: ["pending", "in-transit", "documents-submitted", "completed"] },
          limit: { type: "number", description: "Max results to return" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "shipment_update_status",
      description: "Update shipment status. Use for: mark as, update status, docs submitted, telex released, delivered, etc.",
      parameters: {
        type: "object",
        properties: {
          lot_number: { type: "string", description: "LOT number to update" },
          status: { type: "string", enum: ["pending", "in-transit", "documents-submitted", "completed"] },
          document_submitted: { type: "boolean" },
          document_submitted_date: { type: "string" },
          telex_released: { type: "boolean" },
          telex_released_date: { type: "string" },
          delivery_date: { type: "string" },
          notes: { type: "string" }
        },
        required: ["lot_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "shipment_add_costs",
      description: "Add or update costs for a shipment.",
      parameters: {
        type: "object",
        properties: {
          lot_number: { type: "string" },
          supplier_cost: { type: "number" },
          freight_cost: { type: "number" },
          clearing_cost: { type: "number" },
          transport_cost: { type: "number" },
          currency: { type: "string", enum: ["USD", "EUR"] },
          fx_spot_rate: { type: "number" },
          fx_applied_rate: { type: "number" },
          bank_charges: { type: "number" }
        },
        required: ["lot_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "shipment_add_revenue",
      description: "Add client invoice (revenue) to a shipment.",
      parameters: {
        type: "object",
        properties: {
          lot_number: { type: "string" },
          client_invoice_zar: { type: "number", description: "Invoice amount in ZAR" },
          invoice_number: { type: "string" },
          invoice_date: { type: "string" }
        },
        required: ["lot_number", "client_invoice_zar"]
      }
    }
  },
  // Supplier Tools
  {
    type: "function",
    function: {
      name: "supplier_query",
      description: "Get supplier information and balance.",
      parameters: {
        type: "object",
        properties: {
          supplier_name: { type: "string" },
          list_all: { type: "boolean" },
          has_balance: { type: "boolean", description: "Only suppliers with outstanding balance" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "supplier_balance",
      description: "Get detailed supplier balance with transaction history.",
      parameters: {
        type: "object",
        properties: {
          supplier_name: { type: "string" },
          include_transactions: { type: "boolean" },
          transaction_limit: { type: "number" }
        },
        required: ["supplier_name"]
      }
    }
  },
  // Payment Tools
  {
    type: "function",
    function: {
      name: "payment_create",
      description: "Record a payment to a supplier.",
      parameters: {
        type: "object",
        properties: {
          supplier_name: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string" },
          fx_rate: { type: "number" },
          payment_date: { type: "string" },
          reference: { type: "string" },
          lot_number: { type: "string" },
          notes: { type: "string" }
        },
        required: ["supplier_name", "amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "payment_schedule",
      description: "Schedule a future payment.",
      parameters: {
        type: "object",
        properties: {
          supplier_name: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string" },
          due_date: { type: "string" },
          lot_number: { type: "string" },
          notes: { type: "string" }
        },
        required: ["supplier_name", "amount", "due_date"]
      }
    }
  },
  // Report Tools
  {
    type: "function",
    function: {
      name: "report_profit_summary",
      description: "Generate profit summary report for a period.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["day", "week", "month", "quarter", "year"] },
          date_from: { type: "string" },
          date_to: { type: "string" },
          group_by: { type: "string", enum: ["client", "supplier", "commodity", "none"] }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "report_supplier_balances",
      description: "Get all supplier balances report.",
      parameters: {
        type: "object",
        properties: {
          only_outstanding: { type: "boolean" },
          sort_by: { type: "string", enum: ["balance_desc", "balance_asc", "name"] }
        }
      }
    }
  },
  // Alert Tools
  {
    type: "function",
    function: {
      name: "alert_create",
      description: "Create a proactive alert.",
      parameters: {
        type: "object",
        properties: {
          alert_type: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "urgent", "critical"] },
          title: { type: "string" },
          message: { type: "string" },
          entity_type: { type: "string" },
          entity_reference: { type: "string" }
        },
        required: ["alert_type", "title", "message"]
      }
    }
  }
];

// FLAIR System Prompt
const FLAIR_SYSTEM_PROMPT = `You are FLAIR (Favorite Logistics AI Resource) - the intelligent operations manager for Favorite Logistics, a South African import freight forwarding company owned by Mo Irshad.

## YOUR ROLE
You ARE the ERP system. When users interact with you, they're interacting with the entire business operations system.
You have complete authority to query, create, update, and manage all business data using the available tools.

## BUSINESS CONTEXT
- Business: Import freight forwarding (China/Europe/USA → South Africa)
- Volume: 35-45 shipments/month
- Key suppliers: WINTEX (fabric), HUBEI PUFANG (shoes), HAMZA TOWELS, NINGBO CROSSLEAP
- Key clients: ADNAN JOOSAB, MJ, MOTALA, CHEVAL SHOES, FOOT FOCUS, FOOTWORKS, GLOBAL
- Clearing agents: Sanjith (primary), Shane, Kara, Mojo
- FX Providers: Financiere Suisse (primary), FNB, Obeid

## PROFIT CALCULATION (CRITICAL)
1. Total Foreign = supplier_cost + freight_cost + clearing_cost + transport_cost
2. FX Spread = fx_spot_rate - fx_applied_rate
3. Total ZAR = total_foreign × fx_applied_rate
4. Gross Profit = client_invoice_zar - total_zar
5. FX Commission = total_zar × 0.014 (1.4%)
6. FX Spread Profit = total_foreign × fx_spread
7. Net Profit = gross_profit + fx_commission + fx_spread_profit - bank_charges
8. Profit Margin = (net_profit / client_invoice_zar) × 100%

## TOOL USAGE RULES
1. ALWAYS use tools to get real data - never make up shipment info
2. Chain tools for complex operations
3. Confirm before: deleting anything, payments over $10,000, bulk operations
4. Include relevant context in responses (supplier balance, related shipments)

## RESPONSE STYLE
- Be conversational but efficient
- Use emojis: 📦 shipment, 💰 money, ⚠️ warning, ✅ success, 🚨 urgent
- Always show calculated values (profit, margins, totals)
- Proactively flag issues (high balances, overdue items, low margins)

## NATURAL LANGUAGE PARSING
Understand these patterns:
- "New lot from X for Y" → shipment_create
- "881 docs are in" → shipment_update_status (document_submitted=true)
- "Pay X $50k on Friday" → payment_schedule
- "What do we owe X?" → supplier_balance
- "How did we do this month?" → report_profit_summary

## ALERT THRESHOLDS
- Supplier balance > $50,000: Warning
- ETA in 3 days, no telex: Urgent
- Profit margin < 10%: Warning`;

// Helper: Format date for South Africa
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    timeZone: 'Africa/Johannesburg'
  });
}

// Fetch context for injection
async function fetchContext(supabase: any, channelId?: string): Promise<any> {
  const now = new Date();
  const context: any = {
    current_date: formatDate(now),
    current_time: now.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg' }),
    shipments: [],
    suppliers: [],
    pending_payments: [],
    active_alerts: [],
    conversation_history: []
  };

  const [shipmentsResult, suppliersResult, paymentsResult, alertsResult, historyResult] = await Promise.all([
    supabase.from('v_shipments_full').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('suppliers').select('id, name, currency, current_balance').order('current_balance', { ascending: false }),
    supabase.from('v_pending_payments').select('*').order('payment_date').limit(20),
    supabase.from('proactive_alerts').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(10),
    channelId ? supabase.from('conversation_memory').select('role, content, created_at')
      .eq('channel_id', channelId).order('created_at', { ascending: false }).limit(10) : null
  ]);

  if (shipmentsResult.data) context.shipments = shipmentsResult.data;
  if (suppliersResult.data) context.suppliers = suppliersResult.data;
  if (paymentsResult.data) context.pending_payments = paymentsResult.data;
  if (alertsResult.data) context.active_alerts = alertsResult.data;
  if (historyResult?.data) context.conversation_history = historyResult.data.reverse();

  // Calculate totals
  const activeShipments = context.shipments.filter((s: any) => !['completed', 'cancelled'].includes(s.status));
  context.totals = {
    active_shipments: activeShipments.length,
    total_supplier_balance: context.suppliers.reduce((sum: number, s: any) => sum + (s.current_balance || 0), 0),
    pending_payments_total: context.pending_payments.reduce((sum: number, p: any) => sum + (p.amount_foreign || 0), 0),
    mtd_profit: context.shipments.reduce((sum: number, s: any) => sum + (s.net_profit_zar || 0), 0)
  };

  return context;
}

// Build context prompt
function buildContextPrompt(context: any): string {
  let prompt = `\n## CURRENT SYSTEM STATE (${context.current_date} ${context.current_time} SAST)\n\n`;
  
  // Quick stats
  prompt += `### Quick Stats\n`;
  prompt += `- Active Shipments: ${context.totals.active_shipments}\n`;
  prompt += `- Total Supplier Balance: $${context.totals.total_supplier_balance.toLocaleString()}\n`;
  prompt += `- Pending Payments: $${context.totals.pending_payments_total.toLocaleString()}\n`;
  prompt += `- MTD Profit: R${context.totals.mtd_profit.toLocaleString()}\n\n`;

  // High balance suppliers
  const highBalance = context.suppliers.filter((s: any) => s.current_balance > 50000);
  if (highBalance.length > 0) {
    prompt += `### ⚠️ High Supplier Balances\n`;
    highBalance.forEach((s: any) => {
      prompt += `- ${s.name}: ${s.currency} ${s.current_balance.toLocaleString()}\n`;
    });
    prompt += '\n';
  }

  // Pending payments
  if (context.pending_payments.length > 0) {
    prompt += `### Pending Payments\n`;
    context.pending_payments.slice(0, 5).forEach((p: any) => {
      prompt += `- ${p.supplier_name}: ${p.currency} ${p.amount_foreign?.toLocaleString()} due ${p.payment_date}\n`;
    });
    prompt += '\n';
  }

  // Active alerts
  if (context.active_alerts.length > 0) {
    prompt += `### 🚨 Active Alerts\n`;
    context.active_alerts.forEach((a: any) => {
      prompt += `- [${a.severity.toUpperCase()}] ${a.title}\n`;
    });
    prompt += '\n';
  }

  // Recent shipments
  prompt += `### Recent Shipments\n`;
  context.shipments.slice(0, 10).forEach((s: any) => {
    const margin = s.profit_margin ? `${s.profit_margin.toFixed(1)}%` : 'N/A';
    prompt += `- LOT ${s.lot_number}: ${s.supplier_name || '?'} → ${s.client_name || '?'} | ${s.status} | Margin: ${margin}\n`;
  });

  return prompt;
}

// Tool execution functions
async function executeTool(supabase: any, toolName: string, params: any, context: any): Promise<any> {
  const startTime = Date.now();
  let result: any = { success: false };

  try {
    switch (toolName) {
      case 'shipment_create': {
        // Find or create supplier
        let supplierId = null;
        if (params.supplier_name) {
          const { data: suppliers } = await supabase
            .from('suppliers')
            .select('id')
            .ilike('name', `%${params.supplier_name}%`)
            .limit(1);
          
          if (suppliers?.length) {
            supplierId = suppliers[0].id;
          } else {
            const { data: newSupplier } = await supabase
              .from('suppliers')
              .insert({ name: params.supplier_name, currency: params.currency || 'USD' })
              .select()
              .single();
            supplierId = newSupplier?.id;
          }
        }

        // Find or create client
        let clientId = null;
        if (params.client_name) {
          const { data: clients } = await supabase
            .from('clients')
            .select('id')
            .ilike('name', `%${params.client_name}%`)
            .limit(1);
          
          if (clients?.length) {
            clientId = clients[0].id;
          } else {
            const { data: newClient } = await supabase
              .from('clients')
              .insert({ name: params.client_name })
              .select()
              .single();
            clientId = newClient?.id;
          }
        }

        // Generate LOT number
        let lotNumber = params.lot_number;
        if (!lotNumber) {
          const { data: lastShipment } = await supabase
            .from('shipments')
            .select('lot_number')
            .order('created_at', { ascending: false })
            .limit(1);
          const lastNum = lastShipment?.[0]?.lot_number ? parseInt(lastShipment[0].lot_number) : 885;
          lotNumber = String(lastNum + 1);
        }

        // Create shipment
        const { data: shipment, error } = await supabase
          .from('shipments')
          .insert({
            lot_number: lotNumber,
            supplier_id: supplierId,
            client_id: clientId,
            commodity: params.commodity,
            eta: params.eta,
            status: 'pending',
            notes: params.notes
          })
          .select()
          .single();

        if (error) throw error;

        // Create costs if provided
        if (params.supplier_cost) {
          await supabase.from('shipment_costs').insert({
            shipment_id: shipment.id,
            supplier_cost: params.supplier_cost,
            source_currency: params.currency || 'USD'
          });
        }

        result = {
          success: true,
          data: {
            id: shipment.id,
            lot_number: lotNumber,
            supplier_name: params.supplier_name,
            client_name: params.client_name,
            commodity: params.commodity,
            eta: params.eta,
            supplier_cost: params.supplier_cost
          }
        };
        break;
      }

      case 'shipment_query': {
        let query = supabase.from('v_shipments_full').select('*');
        
        if (params.lot_number) {
          query = query.ilike('lot_number', `%${params.lot_number}%`);
        }
        if (params.supplier_name) {
          query = query.ilike('supplier_name', `%${params.supplier_name}%`);
        }
        if (params.client_name) {
          query = query.ilike('client_name', `%${params.client_name}%`);
        }
        if (params.status) {
          query = query.eq('status', params.status);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false }).limit(params.limit || 10);
        if (error) throw error;
        
        result = { success: true, data };
        break;
      }

      case 'shipment_update_status': {
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id, status')
          .ilike('lot_number', `%${params.lot_number}%`)
          .limit(1);

        if (!shipments?.length) {
          result = { success: false, error: `Shipment LOT ${params.lot_number} not found` };
          break;
        }

        const updates: any = { updated_at: new Date().toISOString(), last_updated_by: 'flair' };
        if (params.status) updates.status = params.status;
        if (params.document_submitted !== undefined) updates.document_submitted = params.document_submitted;
        if (params.document_submitted_date) updates.document_submitted_date = params.document_submitted_date;
        if (params.telex_released !== undefined) updates.telex_released = params.telex_released;
        if (params.telex_released_date) updates.telex_released_date = params.telex_released_date;
        if (params.delivery_date) updates.delivery_date = params.delivery_date;
        if (params.notes) updates.notes = params.notes;

        const { error } = await supabase.from('shipments').update(updates).eq('id', shipments[0].id);
        if (error) throw error;

        result = { success: true, data: { lot_number: params.lot_number, updates } };
        break;
      }

      case 'shipment_add_costs': {
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id')
          .ilike('lot_number', `%${params.lot_number}%`)
          .limit(1);

        if (!shipments?.length) {
          result = { success: false, error: `Shipment LOT ${params.lot_number} not found` };
          break;
        }

        const costs: any = {};
        if (params.supplier_cost) costs.supplier_cost = params.supplier_cost;
        if (params.freight_cost) costs.freight_cost = params.freight_cost;
        if (params.clearing_cost) costs.clearing_cost = params.clearing_cost;
        if (params.transport_cost) costs.transport_cost = params.transport_cost;
        if (params.currency) costs.source_currency = params.currency;
        if (params.fx_spot_rate) costs.fx_spot_rate = params.fx_spot_rate;
        if (params.fx_applied_rate) costs.fx_applied_rate = params.fx_applied_rate;
        if (params.bank_charges) costs.bank_charges = params.bank_charges;

        const { data: existing } = await supabase
          .from('shipment_costs')
          .select('id')
          .eq('shipment_id', shipments[0].id)
          .limit(1);

        if (existing?.length) {
          await supabase.from('shipment_costs').update(costs).eq('shipment_id', shipments[0].id);
        } else {
          await supabase.from('shipment_costs').insert({ shipment_id: shipments[0].id, ...costs });
        }

        result = { success: true, data: { lot_number: params.lot_number, costs } };
        break;
      }

      case 'shipment_add_revenue': {
        const { data: shipments } = await supabase
          .from('shipments')
          .select('id')
          .ilike('lot_number', `%${params.lot_number}%`)
          .limit(1);

        if (!shipments?.length) {
          result = { success: false, error: `Shipment LOT ${params.lot_number} not found` };
          break;
        }

        const revenue = {
          client_invoice_zar: params.client_invoice_zar,
          invoice_number: params.invoice_number,
          invoice_date: params.invoice_date
        };

        await supabase.from('shipment_costs').update(revenue).eq('shipment_id', shipments[0].id);

        result = { success: true, data: { lot_number: params.lot_number, revenue } };
        break;
      }

      case 'supplier_query': {
        let query = supabase.from('suppliers').select('*');
        
        if (params.supplier_name) {
          query = query.ilike('name', `%${params.supplier_name}%`);
        }
        if (params.has_balance) {
          query = query.gt('current_balance', 0);
        }
        
        const { data, error } = await query.order('name');
        if (error) throw error;
        
        result = { success: true, data };
        break;
      }

      case 'supplier_balance': {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*')
          .ilike('name', `%${params.supplier_name}%`)
          .limit(1);

        if (!suppliers?.length) {
          result = { success: false, error: `Supplier ${params.supplier_name} not found` };
          break;
        }

        const supplier = suppliers[0];
        let transactions: any[] = [];

        if (params.include_transactions !== false) {
          const { data: ledger } = await supabase
            .from('supplier_ledger')
            .select('*, shipment:shipments(lot_number)')
            .eq('supplier_id', supplier.id)
            .order('transaction_date', { ascending: false })
            .limit(params.transaction_limit || 10);
          transactions = ledger || [];
        }

        result = {
          success: true,
          data: {
            supplier,
            balance: supplier.current_balance,
            currency: supplier.currency,
            transactions
          }
        };
        break;
      }

      case 'payment_create': {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${params.supplier_name}%`)
          .limit(1);

        if (!suppliers?.length) {
          result = { success: false, error: `Supplier ${params.supplier_name} not found` };
          break;
        }

        // Create ledger entry (credit reduces what we owe)
        const { error } = await supabase.from('supplier_ledger').insert({
          supplier_id: suppliers[0].id,
          ledger_type: 'credit',
          amount: params.amount,
          transaction_date: params.payment_date || new Date().toISOString().split('T')[0],
          invoice_number: params.reference,
          description: `Payment: ${params.notes || params.reference || ''}`
        });

        if (error) throw error;

        result = {
          success: true,
          data: {
            supplier_name: params.supplier_name,
            amount: params.amount,
            currency: params.currency || 'USD',
            date: params.payment_date
          }
        };
        break;
      }

      case 'payment_schedule': {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${params.supplier_name}%`)
          .limit(1);

        if (!suppliers?.length) {
          result = { success: false, error: `Supplier ${params.supplier_name} not found` };
          break;
        }

        let shipmentId = null;
        if (params.lot_number) {
          const { data: shipments } = await supabase
            .from('shipments')
            .select('id')
            .ilike('lot_number', `%${params.lot_number}%`)
            .limit(1);
          shipmentId = shipments?.[0]?.id;
        }

        const { data: payment, error } = await supabase
          .from('payment_schedule')
          .insert({
            supplier_id: suppliers[0].id,
            shipment_id: shipmentId,
            amount_foreign: params.amount,
            currency: params.currency || 'USD',
            payment_date: params.due_date,
            status: 'pending',
            notes: params.notes
          })
          .select()
          .single();

        if (error) throw error;

        result = {
          success: true,
          data: {
            id: payment.id,
            supplier_name: params.supplier_name,
            amount: params.amount,
            due_date: params.due_date
          }
        };
        break;
      }

      case 'report_profit_summary': {
        let query = supabase.from('v_shipments_full').select('*').eq('status', 'completed');
        
        const now = new Date();
        let dateFrom = params.date_from;
        let dateTo = params.date_to || now.toISOString().split('T')[0];

        if (!dateFrom && params.period) {
          const d = new Date();
          switch (params.period) {
            case 'day': d.setDate(d.getDate() - 1); break;
            case 'week': d.setDate(d.getDate() - 7); break;
            case 'month': d.setMonth(d.getMonth() - 1); break;
            case 'quarter': d.setMonth(d.getMonth() - 3); break;
            case 'year': d.setFullYear(d.getFullYear() - 1); break;
          }
          dateFrom = d.toISOString().split('T')[0];
        }

        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        const { data: shipments, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        const summary = {
          period: { from: dateFrom, to: dateTo },
          total_shipments: shipments?.length || 0,
          total_revenue: shipments?.reduce((sum: number, s: any) => sum + (s.client_invoice_zar || 0), 0) || 0,
          total_costs: shipments?.reduce((sum: number, s: any) => sum + (s.total_zar || 0), 0) || 0,
          total_profit: shipments?.reduce((sum: number, s: any) => sum + (s.net_profit_zar || 0), 0) || 0,
          avg_margin: shipments?.length 
            ? shipments.reduce((sum: number, s: any) => sum + (s.profit_margin || 0), 0) / shipments.length 
            : 0,
          shipments
        };

        result = { success: true, data: summary };
        break;
      }

      case 'report_supplier_balances': {
        let query = supabase.from('suppliers').select('*');
        
        if (params.only_outstanding !== false) {
          query = query.gt('current_balance', 0);
        }

        if (params.sort_by === 'balance_asc') {
          query = query.order('current_balance', { ascending: true });
        } else if (params.sort_by === 'name') {
          query = query.order('name');
        } else {
          query = query.order('current_balance', { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;

        const total = data?.reduce((sum: number, s: any) => sum + (s.current_balance || 0), 0) || 0;

        result = { success: true, data: { suppliers: data, total_outstanding: total } };
        break;
      }

      case 'alert_create': {
        const { data: alert, error } = await supabase
          .from('proactive_alerts')
          .insert({
            alert_type: params.alert_type,
            severity: params.severity || 'info',
            title: params.title,
            message: params.message,
            entity_type: params.entity_type,
            entity_reference: params.entity_reference
          })
          .select()
          .single();

        if (error) throw error;

        result = { success: true, data: alert };
        break;
      }

      default:
        result = { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }

  result.execution_time_ms = Date.now() - startTime;
  return result;
}

// Log tool execution
async function logToolExecution(supabase: any, conversationId: string | null, userId: string | null, toolName: string, params: any, result: any) {
  try {
    await supabase.from('ai_tool_executions').insert({
      conversation_id: conversationId,
      user_id: userId,
      tool_name: toolName,
      tool_category: toolName.split('_')[0],
      input_params: params,
      output_result: result,
      success: result.success,
      error_message: result.error,
      execution_time_ms: result.execution_time_ms,
      completed_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to log tool execution:', e);
  }
}

// Call AI with tools
async function callAIWithTools(systemPrompt: string, contextPrompt: string, history: any[], userMessage: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt + contextPrompt },
        ...history,
        { role: 'user', content: userMessage }
      ],
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto'
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('RATE_LIMITED');
    if (response.status === 402) throw new Error('PAYMENT_REQUIRED');
    throw new Error(`AI API error: ${response.status}`);
  }

  return await response.json();
}

// Get final response after tools
async function getFinalResponse(systemPrompt: string, contextPrompt: string, history: any[], userMessage: string, toolCalls: any[], toolResults: any[]): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const messages = [
    { role: 'system', content: systemPrompt + contextPrompt },
    ...history,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: null, tool_calls: toolCalls },
    ...toolResults.map((r: any, i: number) => ({
      role: 'tool',
      tool_call_id: toolCalls[i].id,
      content: JSON.stringify(r)
    }))
  ];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Operation completed.';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { message, channel = 'web', channel_id, user_id } = await req.json();
    console.log(`[FLAIR] ${channel}: "${message}"`);

    // 1. Fetch context
    const context = await fetchContext(supabase, channel_id);
    const contextPrompt = buildContextPrompt(context);

    // 2. Store user message
    const { data: userMsg } = await supabase
      .from('conversation_memory')
      .insert({ user_id, channel, channel_id, role: 'user', content: message })
      .select()
      .single();

    // 3. Build conversation history
    const history = context.conversation_history.map((m: any) => ({
      role: m.role,
      content: m.content
    }));

    // 4. Call AI with tools
    const aiResponse = await callAIWithTools(FLAIR_SYSTEM_PROMPT, contextPrompt, history, message);
    const aiMessage = aiResponse.choices?.[0]?.message;

    let finalResponse = aiMessage?.content || '';
    const toolsUsed: string[] = [];
    const toolResults: any[] = [];

    // 5. Execute tool calls if any
    if (aiMessage?.tool_calls?.length > 0) {
      for (const toolCall of aiMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const params = JSON.parse(toolCall.function.arguments);
        
        console.log(`[FLAIR] Tool: ${toolName}`, params);
        toolsUsed.push(toolName);

        const result = await executeTool(supabase, toolName, params, context);
        toolResults.push(result);

        // Log execution
        await logToolExecution(supabase, userMsg?.id, user_id, toolName, params, result);
      }

      // Get final response after tools
      finalResponse = await getFinalResponse(FLAIR_SYSTEM_PROMPT, contextPrompt, history, message, aiMessage.tool_calls, toolResults);
    }

    // 6. Store assistant response
    await supabase.from('conversation_memory').insert({
      user_id,
      channel,
      channel_id,
      role: 'assistant',
      content: finalResponse,
      tools_used: toolsUsed
    });

    return new Response(
      JSON.stringify({
        success: true,
        response: finalResponse,
        tools_used: toolsUsed,
        tool_results: toolResults,
        context_summary: context.totals
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FLAIR] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage === 'RATE_LIMITED') {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limited. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (errorMessage === 'PAYMENT_REQUIRED') {
      return new Response(
        JSON.stringify({ success: false, error: 'AI credits exhausted. Please add credits.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage, response: '❌ Sorry, I encountered an error. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
