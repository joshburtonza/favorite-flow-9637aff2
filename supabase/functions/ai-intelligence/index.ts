import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Document classification prompt
const CLASSIFICATION_PROMPT = `You are a document classifier for a freight forwarding company.
Classify the document and extract key data. Return JSON only.

DOCUMENT TYPES:
- supplier_invoice: Invoice from overseas supplier for goods
- client_invoice: Our invoice to South African client  
- telex_release: Shipping release document
- packing_list: List of items in shipment
- bill_of_lading: Shipping document (BOL)
- clearing_invoice: Invoice from clearing agent
- transport_invoice: Invoice from transport company
- payment_proof: Bank payment confirmation
- customs_document: Customs clearance documents
- other: Unknown document type

CRITICAL FIELDS TO EXTRACT:
- lot_number: The LOT/shipment reference (e.g., "LOT 881", "881", "2403-045")
- supplier_name: Overseas supplier name
- client_name: South African client name  
- invoice_number: Document reference number
- total_amount: Main monetary value
- currency: USD, EUR, or ZAR
- date: Document date (YYYY-MM-DD format)

Return ONLY valid JSON:
{
  "document_type": "supplier_invoice",
  "confidence": 0.95,
  "reasoning": "Brief explanation",
  "extracted_data": {
    "lot_number": "881",
    "supplier_name": "WINTEX",
    "client_name": null,
    "invoice_number": "INV-2024-001",
    "total_amount": 45000.00,
    "currency": "USD",
    "date": "2024-03-15",
    "commodity": "Sunflower Oil",
    "quantity": null,
    "unit_price": null,
    "freight_cost": null,
    "clearing_cost": null,
    "transport_cost": null,
    "fx_rate": null,
    "payment_date": null,
    "container_number": null,
    "vessel_name": null,
    "eta": null
  }
}`;

// System awareness prompt for AI queries - FULL SYSTEM AWARENESS
function getSystemAwarenessPrompt(context: any): string {
  const recentChanges = context.recent_changes || [];
  const changesNarrative = recentChanges.length > 0 
    ? recentChanges.map((c: any) => `• ${c.description} (${c.time_ago})`).join('\n')
    : 'No recent changes';

  return `You are an AI assistant with COMPLETE REAL-TIME AWARENESS of Favorite Logistics freight forwarding system.

## 🔴 RECENT SYSTEM CHANGES (MOST IMPORTANT - WHAT JUST HAPPENED):
${changesNarrative}

## CURRENT DATE: ${context.current_date}

## LIVE SYSTEM STATE:

### Active Shipments (${context.shipments?.length || 0} total):
${context.shipments?.slice(0, 15).map((s: any) => 
  `• LOT ${s.lot_number}: ${s.status} | ${s.supplier_name} → ${s.client_name} | ETA: ${s.eta || 'TBD'} | Profit: R${(s.net_profit_zar || 0).toLocaleString()}`
).join('\n') || 'No shipments'}

### Suppliers with Balances:
${context.suppliers?.filter((s: any) => s.balance_owed !== 0).map((s: any) => 
  `• ${s.name}: ${s.currency} ${s.balance_owed?.toLocaleString()} ${s.balance_owed > 0 ? '(WE OWE)' : '(THEY OWE US)'}`
).join('\n') || 'All balances settled'}

### Pending Payments:
${context.pending_payments?.slice(0, 5).map((p: any) => 
  `• ${p.supplier_name}: ${p.currency} ${p.amount_foreign?.toLocaleString()} due ${p.payment_date}`
).join('\n') || 'No pending payments'}

### Recent Documents (last 10):
${context.documents?.slice(0, 10).map((d: any) => 
  `• ${d.file_name} - ${d.ai_classification || 'unclassified'} ${d.lot_number ? `(LOT ${d.lot_number})` : ''}`
).join('\n') || 'No documents'}

### Financial Summary:
- Total Shipments: ${context.totals?.total_shipments || 0}
- Total Revenue: R${(context.totals?.total_revenue || 0).toLocaleString()}
- Total Profit: R${(context.totals?.total_profit || 0).toLocaleString()}
- Average Margin: ${(context.totals?.avg_margin || 0).toFixed(1)}%

## YOUR CAPABILITIES:
1. You are ALWAYS aware of recent changes - shipments updated, documents uploaded, costs added, payments made
2. When asked "what's new" or "what changed" - reference the RECENT CHANGES section
3. Answer questions about any shipment, document, supplier, client, or payment
4. Calculate financial metrics (profit, margin, costs, revenue)
5. Track document status and identify what's missing for each shipment
6. Proactively mention if something relevant just changed

## RESPONSE GUIDELINES:
- Be direct and specific with numbers
- Use R for ZAR, $ for USD, € for EUR
- ALWAYS reference recent changes if they're relevant to the question
- If someone asks about a shipment that was just updated, mention the update
- Format large numbers with commas
- Suggest next actions when appropriate

## FOCUS ENTITY (if specified):
${context.current_entity ? JSON.stringify(context.current_entity, null, 2) : 'General query - no specific entity'}`;
}

// Fetch comprehensive system context with FULL CHANGE AWARENESS
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
      
      // Calculate totals
      context.totals = {
        total_shipments: shipments.length,
        total_revenue: shipments.reduce((sum: number, s: any) => sum + (s.client_invoice_zar || 0), 0),
        total_profit: shipments.reduce((sum: number, s: any) => sum + (s.net_profit_zar || 0), 0),
        avg_margin: shipments.filter((s: any) => s.profit_margin).reduce((sum: number, s: any, _: number, arr: any[]) => 
          sum + (s.profit_margin || 0) / arr.length, 0)
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

    // Fetch recent activity from BOTH event logs AND activity logs for complete awareness
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

    // Process AI events
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
          description = `📦 New shipment created: LOT ${e.metadata?.lot_number || 'Unknown'}`;
          break;
        case 'shipment_updated':
          description = `✏️ Shipment LOT ${e.metadata?.lot_number} updated`;
          if (e.changes) {
            const changedFields = Object.keys(e.changes).join(', ');
            description += ` (${changedFields})`;
          }
          break;
        case 'shipment_status_changed':
          description = `🔄 LOT ${e.metadata?.lot_number} status: ${e.changes?.status?.old} → ${e.changes?.status?.new}`;
          break;
        case 'relationship_created':
          description = `🔗 Document linked to shipment${e.metadata?.auto_linked ? ' (auto)' : ''}`;
          break;
        default:
          description = `${e.event_type}: ${e.entity_type}`;
      }
      
      allChanges.push({
        timestamp: new Date(e.timestamp),
        time_ago: timeAgo,
        description,
        type: 'ai_event'
      });
    });

    // Process activity logs
    activities.forEach((a: any) => {
      const timeAgo = getTimeAgo(new Date(a.created_at));
      let emoji = '📝';
      
      switch (a.action_type) {
        case 'create': emoji = '➕'; break;
        case 'update': emoji = '✏️'; break;
        case 'delete': emoji = '🗑️'; break;
        case 'view': emoji = '👁️'; break;
        case 'export': emoji = '📤'; break;
        case 'import': emoji = '📥'; break;
      }
      
      allChanges.push({
        timestamp: new Date(a.created_at),
        time_ago: timeAgo,
        description: `${emoji} ${a.description}${a.user_email ? ` (by ${a.user_email})` : ''}`,
        type: 'activity'
      });
    });

    // Sort by timestamp and take most recent
    context.recent_changes = allChanges
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    context.recent_activity = events.map((e: any) => ({
      event_type: e.event_type,
      entity_type: e.entity_type,
      timestamp: e.timestamp,
      metadata: e.metadata,
      changes: e.changes
    }));

    // Fetch documents
    const { data: documents } = await supabase
      .from('uploaded_documents')
      .select('id, file_name, document_type, ai_classification, lot_number, supplier_name, client_name, shipment_id, uploaded_at, ai_confidence')
      .order('uploaded_at', { ascending: false })
      .limit(50);

    if (documents) {
      context.documents = documents;
    }

    // If specific entity requested, get full details
    if (entityType === 'shipment' && entityId) {
      const { data: shipment } = await supabase
        .from('v_shipments_full')
        .select('*')
        .eq('id', entityId)
        .single();

      if (shipment) {
        // Get linked documents
        const { data: linkedDocs } = await supabase
          .from('uploaded_documents')
          .select('*')
          .eq('shipment_id', entityId);

        // Get activity for this shipment
        const { data: shipmentEvents } = await supabase
          .from('ai_event_logs')
          .select('*')
          .eq('entity_id', entityId)
          .order('timestamp', { ascending: false })
          .limit(10);

        context.current_entity = {
          ...shipment,
          linked_documents: linkedDocs || [],
          activity_history: shipmentEvents || [],
          missing_documents: identifyMissingDocuments(shipment, linkedDocs || [])
        };
      }
    }

  } catch (error) {
    console.error('Error fetching system context:', error);
  }

  return context;
}

// Identify missing documents for a shipment
function identifyMissingDocuments(shipment: any, documents: any[]): string[] {
  const missing: string[] = [];
  const docTypes = documents.map(d => d.ai_classification || d.document_type);

  if (!docTypes.includes('supplier_invoice') && !shipment.supplier_cost) {
    missing.push('supplier_invoice');
  }
  if (!docTypes.includes('telex_release') && !shipment.telex_released) {
    missing.push('telex_release');
  }
  if (!docTypes.includes('clearing_invoice') && !shipment.clearing_cost) {
    missing.push('clearing_invoice');
  }
  if (!docTypes.includes('client_invoice') && !shipment.client_invoice_zar) {
    missing.push('client_invoice');
  }
  if (!docTypes.includes('bill_of_lading')) {
    missing.push('bill_of_lading');
  }

  return missing;
}

// Helper function to get human-readable time ago
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

// Log event to database
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

// Auto-link document to shipment based on lot number
async function autoLinkDocument(supabase: any, documentId: string, lotNumber: string): Promise<any> {
  // Find shipment by lot number
  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, lot_number')
    .or(`lot_number.ilike.%${lotNumber}%,lot_number.eq.${lotNumber}`)
    .limit(1)
    .single();

  if (shipment) {
    // Link document to shipment
    await supabase
      .from('uploaded_documents')
      .update({ 
        shipment_id: shipment.id, 
        auto_linked: true,
        requires_manual_linking: false 
      })
      .eq('id', documentId);

    return shipment;
  }

  // No matching shipment found
  await supabase
    .from('uploaded_documents')
    .update({ requires_manual_linking: true })
    .eq('id', documentId);

  return null;
}

// Auto-update shipment based on document data
async function autoUpdateShipment(
  supabase: any, 
  shipmentId: string, 
  documentType: string, 
  extractedData: any
): Promise<any> {
  const updates: any = { last_updated_by: 'ai_auto' };

  switch (documentType) {
    case 'supplier_invoice':
      if (extractedData.total_amount && extractedData.currency !== 'ZAR') {
        // This would update shipment_costs, not shipments directly
        // For now, just log it
      }
      break;

    case 'telex_release':
      updates.telex_released = true;
      updates.telex_released_date = extractedData.date || new Date().toISOString().split('T')[0];
      if (extractedData.container_number) {
        updates.notes = `Container: ${extractedData.container_number}`;
      }
      break;

    case 'bill_of_lading':
      if (extractedData.eta) {
        updates.eta = extractedData.eta;
      }
      if (extractedData.vessel_name) {
        updates.notes = `Vessel: ${extractedData.vessel_name}`;
      }
      break;

    case 'client_invoice':
      // Would update shipment_costs for client_invoice_zar
      break;
  }

  if (Object.keys(updates).length > 1) {
    const { error } = await supabase
      .from('shipments')
      .update(updates)
      .eq('id', shipmentId);

    if (error) {
      console.error('Error auto-updating shipment:', error);
      return null;
    }

    return updates;
  }

  return null;
}

// Call Lovable AI Gateway
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
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    if (response.status === 402) {
      throw new Error('PAYMENT_REQUIRED');
    }
    const errorText = await response.text();
    console.error('Lovable AI error:', response.status, errorText);
    throw new Error('AI query failed');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      documentContent, 
      documentId,
      documentName,
      query,
      entityType,
      entityId 
    } = await req.json();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Action: Classify and extract from document
    if (action === 'classify_document') {
      console.log(`Classifying document: ${documentName}`);

      try {
        const content = await callLovableAI([
          { role: 'system', content: CLASSIFICATION_PROMPT },
          { role: 'user', content: `Classify this document:\n\nFilename: ${documentName}\n\nContent:\n${documentContent}` }
        ]);
        
        // Parse AI response
        let result;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (e) {
          console.error('Failed to parse AI response:', content);
          result = null;
        }

        if (result && documentId) {
          // Update document with classification
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

          // Auto-link to shipment if lot number found
          if (result.extracted_data?.lot_number) {
            const linkedShipment = await autoLinkDocument(
              supabase, 
              documentId, 
              result.extracted_data.lot_number
            );

            if (linkedShipment) {
              // Auto-update shipment based on document type
              await autoUpdateShipment(
                supabase,
                linkedShipment.id,
                result.document_type,
                result.extracted_data
              );

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
            JSON.stringify({ success: false, error: 'Rate limited. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (errorMessage === 'PAYMENT_REQUIRED') {
          return new Response(
            JSON.stringify({ success: false, error: 'AI credits exhausted. Please add more credits.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }
    }

    // Action: Update shipment via natural language
    if (action === 'update_shipment') {
      const { lotNumber, updates } = await req.json();
      console.log(`Updating shipment LOT ${lotNumber}:`, updates);

      // Find the shipment
      const { data: shipments, error: findError } = await supabase
        .from('shipments')
        .select('id, lot_number, status')
        .ilike('lot_number', `%${lotNumber}%`)
        .limit(1);

      if (findError || !shipments?.length) {
        return new Response(
          JSON.stringify({ success: false, error: `Shipment LOT ${lotNumber} not found` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const shipment = shipments[0];
      const oldStatus = shipment.status;

      // Update the shipment
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ ...updates, updated_at: new Date().toISOString(), last_updated_by: 'ai_chat' })
        .eq('id', shipment.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If updating costs, handle shipment_costs table
      if (updates.freight_cost || updates.supplier_cost || updates.clearing_cost || updates.transport_cost || updates.client_invoice_zar) {
        const costUpdates: any = {};
        if (updates.freight_cost) costUpdates.freight_cost = updates.freight_cost;
        if (updates.supplier_cost) costUpdates.supplier_cost = updates.supplier_cost;
        if (updates.clearing_cost) costUpdates.clearing_cost = updates.clearing_cost;
        if (updates.transport_cost) costUpdates.transport_cost = updates.transport_cost;
        if (updates.client_invoice_zar) costUpdates.client_invoice_zar = updates.client_invoice_zar;

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

      // Log the event
      await logEvent(supabase, {
        event_type: updates.status && updates.status !== oldStatus ? 'shipment_status_changed' : 'shipment_updated',
        entity_type: 'shipment',
        entity_id: shipment.id,
        before_state: { status: oldStatus },
        after_state: updates,
        changes: updates,
        metadata: { lot_number: shipment.lot_number, source: 'ai_chat' }
      });

      return new Response(
        JSON.stringify({ success: true, shipment_id: shipment.id, lot_number: shipment.lot_number, updates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: AI Query with full system awareness (READ + WRITE + FILE SEARCH)
    if (action === 'query') {
      console.log(`Processing AI query: ${query}`);

      // Fetch comprehensive system context
      const context = await fetchSystemContext(supabase, entityType, entityId);

      // Check if this is a file search query
      const fileSearchTerms = ['find', 'search', 'show me', 'get', 'look for', 'where is', 'locate', 'fetch', 'retrieve'];
      const fileKeywords = ['file', 'document', 'invoice', 'pdf', 'excel', 'spreadsheet', 'transport', 'clearing', 'bol', 'bill of lading', 'packing list'];
      const queryLower = query.toLowerCase();
      
      const isFileSearch = fileSearchTerms.some(term => queryLower.includes(term)) && 
                           fileKeywords.some(keyword => queryLower.includes(keyword));
      
      // Extract lot number if mentioned
      const lotMatch = queryLower.match(/lot\s*(\d+[\w-]*)/i);
      const lotNumber = lotMatch ? lotMatch[1] : null;

      let fileResults: any[] = [];
      
      if (isFileSearch || lotNumber) {
        // Perform file search
        let searchQuery = supabase
          .from('uploaded_documents')
          .select('id, file_name, file_path, file_type, lot_number, document_type, ai_classification, folder_id')
          .order('uploaded_at', { ascending: false })
          .limit(10);
        
        if (lotNumber) {
          searchQuery = searchQuery.ilike('lot_number', `%${lotNumber}%`);
        } else {
          // Search by document type or file name
          const searchTerms: string[] = [];
          if (queryLower.includes('invoice')) searchTerms.push('invoice');
          if (queryLower.includes('transport')) searchTerms.push('transport');
          if (queryLower.includes('clearing')) searchTerms.push('clearing');
          if (queryLower.includes('bol') || queryLower.includes('bill of lading')) searchTerms.push('bill_of_lading');
          if (queryLower.includes('packing')) searchTerms.push('packing_list');
          if (queryLower.includes('telex')) searchTerms.push('telex');
          
          if (searchTerms.length > 0) {
            const orConditions = searchTerms.map(term => 
              `ai_classification.ilike.%${term}%,document_type.ilike.%${term}%,file_name.ilike.%${term}%`
            ).join(',');
            searchQuery = searchQuery.or(orConditions);
          }
        }
        
        const { data: files } = await searchQuery;
        if (files && files.length > 0) {
          fileResults = files.map(f => ({
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

      // Enhanced system prompt that allows write operations
      const enhancedPrompt = getSystemAwarenessPrompt(context) + `

## WRITE OPERATIONS:
You can also UPDATE shipments when users request changes. When a user says something like:
- "LOT 881 is in transit" → Update status to in-transit
- "Freight paid for LOT 118" → Mark freight as paid in notes or update costs
- "Update LOT 883 ETA to March 15" → Update ETA
- "Mark LOT 882 documents submitted" → Update document_submitted to true

For UPDATE requests, respond with JSON in this format:
\`\`\`json
{
  "action": "update",
  "lot_number": "881",
  "updates": { "status": "in-transit" },
  "message": "✅ Updated LOT 881 status to in-transit"
}
\`\`\`

## FILE SEARCH:
When users ask to find or search for files/documents:
- Search the documents database for matching files
- Return file names and relevant details
- If files are found, they will be displayed as clickable cards

For READ requests, respond naturally with the information.

IMPORTANT: 
- status values: pending, in-transit, documents-submitted, completed
- Always confirm the update in your response
- Be helpful and proactive
- When files are found, acknowledge them in your response`;

      try {
        const response = await callLovableAI([
          { role: 'system', content: enhancedPrompt },
          { role: 'user', content: fileResults.length > 0 
            ? `${query}\n\n[System: Found ${fileResults.length} matching files: ${fileResults.map(f => f.file_name).join(', ')}]`
            : query 
          }
        ]);

        // Check if AI wants to perform an update
        let updateResult = null;
        let finalResponse = response;
        try {
          const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const actionData = JSON.parse(jsonMatch[1]);
            if (actionData.action === 'update' && actionData.lot_number && actionData.updates) {
              // Perform the update
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
                  .update({ ...actionData.updates, updated_at: new Date().toISOString(), last_updated_by: 'ai_chat' })
                  .eq('id', shipment.id);

                // Handle cost updates
                if (actionData.updates.freight_cost || actionData.updates.supplier_cost || 
                    actionData.updates.clearing_cost || actionData.updates.transport_cost) {
                  const costUpdates: any = {};
                  ['freight_cost', 'supplier_cost', 'clearing_cost', 'transport_cost'].forEach(field => {
                    if (actionData.updates[field]) costUpdates[field] = actionData.updates[field];
                  });

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

                // Log the event
                await logEvent(supabase, {
                  event_type: actionData.updates.status && actionData.updates.status !== oldStatus ? 'shipment_status_changed' : 'shipment_updated',
                  entity_type: 'shipment',
                  entity_id: shipment.id,
                  changes: actionData.updates,
                  metadata: { lot_number: actionData.lot_number, source: 'ai_chat' }
                });

                updateResult = { success: true, lot_number: actionData.lot_number, updates: actionData.updates };
                finalResponse = actionData.message || `✅ Updated LOT ${actionData.lot_number}`;
              }
            }
          }
        } catch (e) {
          // Not a JSON response, continue with normal response
        }

        // Log the query
        await logEvent(supabase, {
          event_type: 'ai_query',
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
            JSON.stringify({ success: false, error: 'Rate limited. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (errorMessage === 'PAYMENT_REQUIRED') {
          return new Response(
            JSON.stringify({ success: false, error: 'AI credits exhausted. Please add more credits.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }
    }

    // Action: Get recent activity feed
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

    // Action: Get system context
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
    console.error('AI Intelligence error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
