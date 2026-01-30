import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// FLAIR (Favorite Logistics AI Resource) v2.0
// ============================================

const FLAIR_IDENTITY = `You are **FLAIR** (Favorite Logistics AI Resource) - the intelligent operations manager for Favorite Logistics, a South African import freight forwarding company owned by Mo Irshad.

You are NOT a chatbot. You ARE the primary interface to the entire business operations system. When Mo or his team interact with you, they are interacting with their ERP system. You have complete authority to:
- Query any data in the system
- Create, update, and manage shipments
- Track supplier payments and balances
- Calculate profits and generate reports
- Analyze documents and extract data
- Proactively alert about issues
- Execute multi-step business workflows

Your personality:
- Professional but conversational - Mo talks to you like a trusted operations manager
- Proactive - don't just answer, anticipate what he needs next
- Precise with numbers - this is a business where margins matter
- Context-aware - remember the conversation and connect dots
- Honest about uncertainty - if you don't know, say so and offer to find out`;

const BUSINESS_MODEL = `## THE BUSINESS MODEL

### Company Overview
- **Legal Entity:** Favorite Investments (Pty) Ltd, trading as Favorite Logistics
- **Owner:** Mo Irshad
- **Business Model:** Import freight forwarding and distribution
- **Location:** South Africa
- **Import Origins:** China (primary), Europe, USA
- **Volume:** 35-45 active shipments per month

### Business Flow
1. Client Order → 2. Supplier Booking (LOT assigned) → 3. Payment to Supplier (FX transaction) → 4. Ocean Freight (4-6 weeks) → 5. Customs Clearance (Telex/OBL) → 6. Final Delivery → 7. Client Payment & Profit`;

const KNOWN_ENTITIES = `## KEY BUSINESS ENTITIES

**Known Suppliers:**
WINTEX, WINTEX-ADNAN, HUBEI PUFANG, HAMZA TOWELS, NINGBO CROSSLEAP, AMAGGI, COFCO, BUNGE, CARGILL

**Known Clients:**
ADNAN JOOSAB, MJ, MJ OILS, MOTALA, CHEVAL SHOES, FOOT FOCUS, FOOTWORKS, GLOBAL

**Clearing Agents:** Sanjith (primary), Shane, Kara, Mojo
**FX Providers:** Financiere Suisse (primary), FNB, Obeid`;

const PROFIT_FORMULAS = `## PROFIT CALCULATION FORMULAS

1. **Total Foreign** = supplier_cost + freight_cost + clearing_cost + transport_cost
2. **FX Spread** = fx_spot_rate - fx_applied_rate
3. **Total ZAR** = total_foreign × fx_applied_rate
4. **Gross Profit** = client_invoice_zar - total_zar
5. **FX Commission** = total_zar × 0.014 (1.4%)
6. **FX Spread Profit** = total_foreign × fx_spread
7. **Net Profit** = gross_profit + fx_commission + fx_spread_profit - bank_charges
8. **Profit Margin** = (net_profit / client_invoice_zar) × 100%`;

const ALERT_THRESHOLDS = {
  SUPPLIER_BALANCE_HIGH: 50000,
  ETA_APPROACHING_NO_TELEX_DAYS: 3,
  DOCUMENT_STALE_DAYS: 5,
  PAYMENT_DUE_SOON_DAYS: 2,
  LOW_PROFIT_MARGIN: 10
};

// Document classification prompt
const CLASSIFICATION_PROMPT = `You are FLAIR's document processor for Favorite Logistics.

## BUSINESS CONTEXT
- Import freight forwarding company in South Africa
- Suppliers paid in USD/EUR, clients invoiced in ZAR
- Each shipment has a unique LOT number (e.g., "LOT 881")

## DOCUMENT TYPES:
- supplier_invoice: Invoice from overseas supplier
- client_invoice: Our invoice to SA client  
- telex_release: Shipping release document
- packing_list: List of items in shipment
- bill_of_lading: Shipping document (BOL)
- clearing_invoice: Invoice from clearing agent
- transport_invoice: Invoice from transport company
- payment_proof: Bank payment confirmation
- customs_document: Customs clearance documents

## EXTRACTION RULES:
1. LOT numbers: Look for "LOT", "Shipment", "Reference" + numbers
2. Currency: $ or USD → USD, € or EUR → EUR, R or ZAR → ZAR
3. Dates: Convert to YYYY-MM-DD format
4. Amounts: Numbers without currency symbols

Return ONLY valid JSON:
{
  "document_type": "supplier_invoice",
  "confidence": 0.95,
  "reasoning": "Brief FLAIR-style explanation",
  "extracted_data": {
    "lot_number": "881",
    "supplier_name": "WINTEX",
    "client_name": null,
    "invoice_number": "INV-2024-001",
    "total_amount": 45000.00,
    "currency": "USD",
    "date": "2024-03-15",
    "commodity": null,
    "freight_cost": null,
    "clearing_cost": null,
    "transport_cost": null,
    "fx_rate": null,
    "eta": null
  }
}`;

// FLAIR system awareness prompt with full context
function getFlairSystemPrompt(context: any): string {
  const recentChanges = context.recent_changes || [];
  const changesNarrative = recentChanges.length > 0 
    ? recentChanges.map((c: any) => `• ${c.description} (${c.time_ago})`).join('\n')
    : 'No recent changes';

  // Check for alerts
  const alerts: string[] = [];
  
  // High supplier balances
  context.suppliers?.forEach((s: any) => {
    if (s.balance_owed > ALERT_THRESHOLDS.SUPPLIER_BALANCE_HIGH) {
      alerts.push(`⚠️ ${s.name} balance high: $${s.balance_owed.toLocaleString()}`);
    }
  });
  
  // Approaching ETAs without telex
  const now = new Date();
  context.shipments?.forEach((s: any) => {
    if (s.eta && s.document_submitted && !s.telex_released) {
      const eta = new Date(s.eta);
      const daysUntil = Math.ceil((eta.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= ALERT_THRESHOLDS.ETA_APPROACHING_NO_TELEX_DAYS && daysUntil > 0) {
        alerts.push(`🚨 LOT ${s.lot_number}: ETA in ${daysUntil} days, telex pending!`);
      }
    }
  });
  
  // Low profit margins
  context.shipments?.forEach((s: any) => {
    if (s.profit_margin && s.profit_margin < ALERT_THRESHOLDS.LOW_PROFIT_MARGIN && s.profit_margin > 0) {
      alerts.push(`⚠️ LOT ${s.lot_number}: Low margin ${s.profit_margin.toFixed(1)}%`);
    }
  });

  const alertSection = alerts.length > 0 
    ? `\n## 🚨 ACTIVE ALERTS:\n${alerts.join('\n')}\n` 
    : '';

  return `${FLAIR_IDENTITY}

${BUSINESS_MODEL}

${KNOWN_ENTITIES}

${PROFIT_FORMULAS}

## RESPONSE FORMATTING (Web Interface)

Use markdown with proper structure. For shipments, show:
- Status, ETA, supplier → client route
- Cost breakdown in tables when relevant
- Profit analysis with margin percentage
- Use ✅ for healthy (>15%), ⚠️ for warning (10-15%), ❌ for low (<10%) margins

## PROACTIVE BEHAVIORS

1. **Related Information:** If asked about a shipment, mention supplier balance if high
2. **Warnings:** Flag issues proactively
3. **Suggestions:** "You might want to..." or "Consider..."
4. **Next Actions:** What needs to happen next?
${alertSection}
## 🔴 RECENT SYSTEM CHANGES:
${changesNarrative}

## CURRENT DATE: ${context.current_date}

## LIVE SYSTEM STATE:

### Active Shipments (${context.shipments?.length || 0} total):
${context.shipments?.slice(0, 20).map((s: any) => 
  `• LOT ${s.lot_number}: ${s.status} | ${s.supplier_name || '?'} → ${s.client_name || '?'} | ETA: ${s.eta || 'TBD'} | Profit: R${(s.net_profit_zar || 0).toLocaleString()} (${(s.profit_margin || 0).toFixed(1)}%)`
).join('\n') || 'No shipments'}

### Suppliers with Balances:
${context.suppliers?.filter((s: any) => s.balance_owed !== 0).map((s: any) => {
  const warning = s.balance_owed > ALERT_THRESHOLDS.SUPPLIER_BALANCE_HIGH ? ' ⚠️' : '';
  return `• ${s.name}: ${s.currency} ${s.balance_owed?.toLocaleString()}${warning}`;
}).join('\n') || 'All balances settled'}

### Pending Payments:
${context.pending_payments?.slice(0, 5).map((p: any) => 
  `• ${p.supplier_name}: ${p.currency} ${p.amount_foreign?.toLocaleString()} due ${p.payment_date}`
).join('\n') || 'No pending payments'}

### Recent Documents:
${context.documents?.slice(0, 5).map((d: any) => 
  `• ${d.file_name} - ${d.ai_classification || 'unclassified'} ${d.lot_number ? `(LOT ${d.lot_number})` : ''}`
).join('\n') || 'No documents'}

### Financial Summary:
- Total Shipments: ${context.totals?.total_shipments || 0}
- Total Revenue: R${(context.totals?.total_revenue || 0).toLocaleString()}
- Total Profit: R${(context.totals?.total_profit || 0).toLocaleString()}
- Average Margin: ${(context.totals?.avg_margin || 0).toFixed(1)}%

## CONVERSATION PATTERNS - Interpret naturally:
- "881 docs are in" → Update LOT 881: document_submitted = true
- "What do we owe Wintex?" → Query supplier balance
- "LOT 192 is in transit" → Update status
- "Pay Wintex 50k on Friday" → Schedule payment

## WRITE OPERATIONS:
For UPDATE requests, respond with JSON:
\`\`\`json
{
  "action": "update",
  "lot_number": "881",
  "updates": { "status": "in-transit" },
  "message": "✅ Updated LOT 881 status to in-transit"
}
\`\`\`

Valid status values: pending, in-transit, documents-submitted, completed

## FOCUS ENTITY:
${context.current_entity ? JSON.stringify(context.current_entity, null, 2) : 'General query'}`;
}

// Fetch comprehensive system context
async function fetchSystemContext(supabase: any, entityType?: string, entityId?: string): Promise<any> {
  const context: any = {
    current_date: new Date().toISOString().split('T')[0],
    shipments: [],
    suppliers: [],
    clients: [],
    pending_payments: [],
    recent_activity: [],
    recent_changes: [],
    documents: [],
    current_entity: null
  };

  try {
    // Fetch all shipments with full details
    const { data: shipments } = await supabase
      .from('v_shipments_full')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (shipments) {
      context.shipments = shipments.map((s: any) => ({
        id: s.id,
        lot_number: s.lot_number,
        status: s.status,
        supplier_name: s.supplier_name,
        client_name: s.client_name,
        commodity: s.commodity,
        eta: s.eta,
        document_submitted: s.document_submitted,
        telex_released: s.telex_released,
        supplier_cost: s.supplier_cost,
        freight_cost: s.freight_cost,
        clearing_cost: s.clearing_cost,
        transport_cost: s.transport_cost,
        total_foreign: s.total_foreign,
        total_zar: s.total_zar,
        client_invoice_zar: s.client_invoice_zar,
        gross_profit_zar: s.gross_profit_zar,
        net_profit_zar: s.net_profit_zar,
        profit_margin: s.profit_margin,
        source_currency: s.source_currency,
        created_at: s.created_at
      }));
      
      context.totals = {
        total_shipments: shipments.length,
        total_revenue: shipments.reduce((sum: number, s: any) => sum + (s.client_invoice_zar || 0), 0),
        total_profit: shipments.reduce((sum: number, s: any) => sum + (s.net_profit_zar || 0), 0),
        avg_margin: shipments.filter((s: any) => s.profit_margin).length > 0
          ? shipments.filter((s: any) => s.profit_margin).reduce((sum: number, s: any) => sum + (s.profit_margin || 0), 0) / shipments.filter((s: any) => s.profit_margin).length
          : 0
      };
    }

    // Fetch suppliers with balances
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, currency, current_balance')
      .order('name');

    if (suppliers) {
      context.suppliers = suppliers.map((s: any) => ({
        id: s.id,
        name: s.name,
        currency: s.currency,
        balance_owed: s.current_balance
      }));
    }

    // Fetch clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, contact_person')
      .order('name');

    if (clients) {
      context.clients = clients;
    }

    // Fetch pending payments
    const { data: payments } = await supabase
      .from('v_pending_payments')
      .select('*')
      .eq('status', 'pending')
      .order('payment_date');

    if (payments) {
      context.pending_payments = payments;
    }

    // Fetch recent activity
    const [eventsResult, activityResult] = await Promise.all([
      supabase
        .from('ai_event_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(30),
      supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
    ]);

    const events = eventsResult.data || [];
    const activities = activityResult.data || [];

    // Combine and create human-readable recent changes
    const allChanges: any[] = [];

    events.forEach((e: any) => {
      const timeAgo = getTimeAgo(new Date(e.timestamp));
      let description = '';
      
      switch (e.event_type) {
        case 'document_uploaded':
          description = `📄 Document uploaded: ${e.metadata?.file_name || 'Unknown'}${e.metadata?.lot_number ? ` for LOT ${e.metadata.lot_number}` : ''}`;
          break;
        case 'ai_extraction_completed':
          description = `🤖 AI classified document as ${e.ai_classification} (${Math.round((e.ai_confidence || 0) * 100)}% confidence)`;
          break;
        case 'shipment_created':
          description = `📦 New shipment: LOT ${e.metadata?.lot_number || 'Unknown'}`;
          break;
        case 'shipment_updated':
          description = `✏️ LOT ${e.metadata?.lot_number} updated`;
          break;
        case 'shipment_status_changed':
          description = `🔄 LOT ${e.metadata?.lot_number}: ${e.changes?.status?.old} → ${e.changes?.status?.new}`;
          break;
        default:
          description = `${e.event_type}: ${e.entity_type}`;
      }
      
      allChanges.push({ timestamp: new Date(e.timestamp), time_ago: timeAgo, description, type: 'ai_event' });
    });

    activities.forEach((a: any) => {
      const timeAgo = getTimeAgo(new Date(a.created_at));
      let emoji = '📝';
      switch (a.action_type) {
        case 'create': emoji = '➕'; break;
        case 'update': emoji = '✏️'; break;
        case 'delete': emoji = '🗑️'; break;
      }
      allChanges.push({
        timestamp: new Date(a.created_at),
        time_ago: timeAgo,
        description: `${emoji} ${a.description}`,
        type: 'activity'
      });
    });

    context.recent_changes = allChanges
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 15);

    // Fetch documents
    const { data: documents } = await supabase
      .from('uploaded_documents')
      .select('id, file_name, document_type, ai_classification, lot_number, uploaded_at')
      .order('uploaded_at', { ascending: false })
      .limit(20);

    if (documents) {
      context.documents = documents;
    }

    // Focus entity
    if (entityType === 'shipment' && entityId) {
      const { data: shipment } = await supabase
        .from('v_shipments_full')
        .select('*')
        .eq('id', entityId)
        .single();

      if (shipment) {
        const { data: linkedDocs } = await supabase
          .from('uploaded_documents')
          .select('*')
          .eq('shipment_id', entityId);

        context.current_entity = {
          ...shipment,
          linked_documents: linkedDocs || []
        };
      }
    }

  } catch (error) {
    console.error('Error fetching system context:', error);
  }

  return context;
}

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

async function logEvent(supabase: any, event: any): Promise<void> {
  try {
    await supabase.from('ai_event_logs').insert({
      event_type: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      user_id: event.user_id,
      user_email: event.user_email,
      before_state: event.before_state,
      after_state: event.after_state,
      changes: event.changes,
      related_entities: event.related_entities,
      metadata: event.metadata,
      ai_classification: event.ai_classification,
      ai_extracted_data: event.ai_extracted_data,
      ai_confidence: event.ai_confidence,
      ai_summary: event.ai_summary
    });
  } catch (error) {
    console.error('Error logging event:', error);
  }
}

async function autoLinkDocument(supabase: any, documentId: string, lotNumber: string): Promise<any> {
  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, lot_number')
    .or(`lot_number.ilike.%${lotNumber}%,lot_number.eq.${lotNumber}`)
    .limit(1)
    .single();

  if (shipment) {
    await supabase
      .from('uploaded_documents')
      .update({ shipment_id: shipment.id, auto_linked: true, requires_manual_linking: false })
      .eq('id', documentId);
    return shipment;
  }

  await supabase
    .from('uploaded_documents')
    .update({ requires_manual_linking: true })
    .eq('id', documentId);

  return null;
}

async function autoUpdateShipment(supabase: any, shipmentId: string, documentType: string, extractedData: any): Promise<any> {
  const updates: any = { last_updated_by: 'flair_auto' };

  switch (documentType) {
    case 'telex_release':
      updates.telex_released = true;
      updates.telex_released_date = extractedData.date || new Date().toISOString().split('T')[0];
      break;
    case 'bill_of_lading':
      if (extractedData.eta) updates.eta = extractedData.eta;
      break;
  }

  if (Object.keys(updates).length > 1) {
    await supabase.from('shipments').update(updates).eq('id', shipmentId);
    return updates;
  }
  return null;
}

async function callLovableAI(messages: { role: string; content: string }[]): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('RATE_LIMITED');
    if (response.status === 402) throw new Error('PAYMENT_REQUIRED');
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error('AI query failed');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Generate daily briefing
function generateDailyBriefing(context: any): string {
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  
  const activeShipments = context.shipments?.filter((s: any) => s.status !== 'completed') || [];
  const arrivingThisWeek = activeShipments.filter((s: any) => {
    if (!s.eta) return false;
    const eta = new Date(s.eta);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return eta <= weekFromNow && eta >= now;
  });
  const awaitingTelex = activeShipments.filter((s: any) => s.document_submitted && !s.telex_released);
  
  const highBalanceSuppliers = context.suppliers?.filter((s: any) => 
    s.balance_owed > ALERT_THRESHOLDS.SUPPLIER_BALANCE_HIGH
  ) || [];

  let briefing = `${greeting} Mo! Here's your operations snapshot:\n\n`;
  briefing += `📦 **ACTIVE SHIPMENTS:** ${activeShipments.length}\n`;
  briefing += `├─ ${arrivingThisWeek.length} arriving this week\n`;
  briefing += `├─ ${awaitingTelex.length} awaiting telex\n`;
  briefing += `└─ ${activeShipments.filter((s: any) => s.status === 'in-transit').length} in transit\n\n`;
  
  if (highBalanceSuppliers.length > 0) {
    briefing += `💰 **HIGH SUPPLIER BALANCES** ⚠️\n`;
    highBalanceSuppliers.forEach((s: any) => {
      briefing += `├─ ${s.name}: $${s.balance_owed.toLocaleString()}\n`;
    });
    briefing += `\n`;
  }
  
  briefing += `📈 **MTD PROFIT:** R${(context.totals?.total_profit || 0).toLocaleString()} (${context.totals?.total_shipments || 0} shipments)\n\n`;
  briefing += `What would you like to focus on?`;
  
  return briefing;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, documentContent, documentId, documentName, query, entityType, entityId } = await req.json();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Action: Classify document
    if (action === 'classify_document') {
      console.log(`FLAIR classifying: ${documentName}`);

      try {
        const content = await callLovableAI([
          { role: 'system', content: CLASSIFICATION_PROMPT },
          { role: 'user', content: `Classify this document:\n\nFilename: ${documentName}\n\nContent:\n${documentContent}` }
        ]);
        
        let result;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (e) {
          console.error('Failed to parse AI response:', content);
          result = null;
        }

        if (result && documentId) {
          await supabase
            .from('uploaded_documents')
            .update({
              ai_classification: result.document_type,
              ai_confidence: result.confidence,
              document_type: result.document_type,
              extracted_data: result.extracted_data,
              lot_number: result.extracted_data?.lot_number,
              supplier_name: result.extracted_data?.supplier_name,
              client_name: result.extracted_data?.client_name,
              summary: result.reasoning
            })
            .eq('id', documentId);

          if (result.extracted_data?.lot_number) {
            const linkedShipment = await autoLinkDocument(supabase, documentId, result.extracted_data.lot_number);
            if (linkedShipment) {
              await autoUpdateShipment(supabase, linkedShipment.id, result.document_type, result.extracted_data);
              result.linked_shipment = linkedShipment;
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'RATE_LIMITED') {
          return new Response(
            JSON.stringify({ success: false, error: 'Rate limited. Please try again.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (errorMessage === 'PAYMENT_REQUIRED') {
          return new Response(
            JSON.stringify({ success: false, error: 'AI credits exhausted.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }
    }

    // Action: Daily briefing
    if (action === 'daily_briefing') {
      const context = await fetchSystemContext(supabase);
      const briefing = generateDailyBriefing(context);
      
      return new Response(
        JSON.stringify({ success: true, briefing, context_summary: context.totals }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: AI Query with FLAIR
    if (action === 'query') {
      console.log(`FLAIR processing: ${query}`);

      const context = await fetchSystemContext(supabase, entityType, entityId);

      // File search logic
      const fileSearchTerms = ['find', 'search', 'show me', 'get', 'look for', 'where is', 'locate', 'fetch'];
      const fileKeywords = ['file', 'document', 'invoice', 'pdf', 'transport', 'clearing', 'bol', 'bill of lading', 'packing'];
      const queryLower = query.toLowerCase();
      
      const isFileSearch = fileSearchTerms.some((term: string) => queryLower.includes(term)) && 
                           fileKeywords.some((keyword: string) => queryLower.includes(keyword));
      
      const lotMatch = queryLower.match(/lot\s*(\d+[\w-]*)/i);
      const lotNumber = lotMatch ? lotMatch[1] : null;

      let fileResults: any[] = [];
      
      if (isFileSearch || lotNumber) {
        let searchQuery = supabase
          .from('uploaded_documents')
          .select('id, file_name, file_path, file_type, lot_number, document_type, ai_classification, folder_id')
          .order('uploaded_at', { ascending: false })
          .limit(10);
        
        if (lotNumber) {
          searchQuery = searchQuery.ilike('lot_number', `%${lotNumber}%`);
        } else {
          const searchTerms: string[] = [];
          if (queryLower.includes('invoice')) searchTerms.push('invoice');
          if (queryLower.includes('transport')) searchTerms.push('transport');
          if (queryLower.includes('clearing')) searchTerms.push('clearing');
          if (queryLower.includes('bol') || queryLower.includes('bill of lading')) searchTerms.push('bill_of_lading');
          if (queryLower.includes('packing')) searchTerms.push('packing_list');
          
          if (searchTerms.length > 0) {
            const orConditions = searchTerms.map(term => 
              `ai_classification.ilike.%${term}%,document_type.ilike.%${term}%,file_name.ilike.%${term}%`
            ).join(',');
            searchQuery = searchQuery.or(orConditions);
          }
        }
        
        const { data: files } = await searchQuery;
        if (files && files.length > 0) {
          fileResults = files.map((f: any) => ({
            id: f.id,
            file_name: f.file_name,
            file_path: f.file_path,
            file_type: f.file_type,
            lot_number: f.lot_number,
            document_type: f.ai_classification || f.document_type,
            folder_id: f.folder_id
          }));
        }
      }

      try {
        const response = await callLovableAI([
          { role: 'system', content: getFlairSystemPrompt(context) },
          { role: 'user', content: fileResults.length > 0 
            ? `${query}\n\n[FLAIR found ${fileResults.length} matching files: ${fileResults.map((f: any) => f.file_name).join(', ')}]`
            : query 
          }
        ]);

        // Check for update action
        let updateResult = null;
        let finalResponse = response;
        
        try {
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const actionData = JSON.parse(jsonMatch[1]);
            if (actionData.action === 'update' && actionData.lot_number && actionData.updates) {
              const { data: shipments } = await supabase
                .from('shipments')
                .select('id, status')
                .ilike('lot_number', `%${actionData.lot_number}%`)
                .limit(1);

              if (shipments?.length) {
                const shipment = shipments[0];
                const oldStatus = shipment.status;

                await supabase
                  .from('shipments')
                  .update({ ...actionData.updates, updated_at: new Date().toISOString(), last_updated_by: 'flair' })
                  .eq('id', shipment.id);

                // Handle cost updates
                const costFields = ['freight_cost', 'supplier_cost', 'clearing_cost', 'transport_cost', 'client_invoice_zar'];
                const costUpdates: any = {};
                costFields.forEach(field => {
                  if (actionData.updates[field]) costUpdates[field] = actionData.updates[field];
                });

                if (Object.keys(costUpdates).length > 0) {
                  const { data: existingCosts } = await supabase
                    .from('shipment_costs')
                    .select('id')
                    .eq('shipment_id', shipment.id)
                    .limit(1);

                  if (existingCosts?.length) {
                    await supabase.from('shipment_costs').update(costUpdates).eq('shipment_id', shipment.id);
                  } else {
                    await supabase.from('shipment_costs').insert({ shipment_id: shipment.id, ...costUpdates });
                  }
                }

                await logEvent(supabase, {
                  event_type: actionData.updates.status && actionData.updates.status !== oldStatus ? 'shipment_status_changed' : 'shipment_updated',
                  entity_type: 'shipment',
                  entity_id: shipment.id,
                  changes: actionData.updates,
                  metadata: { lot_number: actionData.lot_number, source: 'flair' }
                });

                updateResult = { success: true, lot_number: actionData.lot_number, updates: actionData.updates };
                finalResponse = actionData.message || `✅ Updated LOT ${actionData.lot_number}`;
              }
            }
          }
        } catch (e) {
          // Not JSON, continue
        }

        await logEvent(supabase, {
          event_type: 'flair_query',
          entity_type: entityType || 'system',
          entity_id: entityId,
          metadata: { query, response_length: finalResponse.length, had_update: !!updateResult, files_found: fileResults.length }
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            response: finalResponse, 
            context_summary: context.totals, 
            update_result: updateResult,
            file_results: fileResults.length > 0 ? fileResults : undefined
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'RATE_LIMITED') {
          return new Response(
            JSON.stringify({ success: false, error: 'Rate limited. Please try again.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (errorMessage === 'PAYMENT_REQUIRED') {
          return new Response(
            JSON.stringify({ success: false, error: 'AI credits exhausted.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }
    }

    // Action: Get activity
    if (action === 'get_activity') {
      const { data: events } = await supabase
        .from('ai_event_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ success: true, events }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: Get context
    if (action === 'get_context') {
      const context = await fetchSystemContext(supabase, entityType, entityId);
      return new Response(
        JSON.stringify({ success: true, context }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('FLAIR error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
