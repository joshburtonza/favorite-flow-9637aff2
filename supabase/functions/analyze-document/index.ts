import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.86.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the AI document processor for Favorite Logistics, a South African freight forwarding company that imports goods from overseas suppliers and delivers them to local South African clients.

## BUSINESS CONTEXT
- We import commodities (grains, oils, sugar, fertilizers, etc.) from international suppliers
- Suppliers are paid in USD or EUR, clients are invoiced in ZAR (South African Rand)
- Each shipment has a unique LOT number (e.g., "LOT 881", "LOT 882", "883")
- We track costs in foreign currency, convert to ZAR, and calculate profit margins
- Key suppliers include: WINTEX, AMAGGI, COFCO, BUNGE, CARGILL, ADM, LDC, NIDERA
- Key clients include: MJ Oils, Tiger Brands, Pioneer Foods, RCL Foods, Astral Foods

## DOCUMENT TYPES YOU'LL RECEIVE

### 1. SUPPLIER INVOICES (invoice)
- From overseas suppliers for goods purchased
- Contains: supplier name, invoice number, LOT/shipment reference, commodity, quantity, unit price, total cost
- Currency: Usually USD or EUR
- Extract: lotNumber, supplierName, supplierCost, currency, invoiceNumber, commodity

### 2. FREIGHT INVOICES (invoice)
- From shipping lines or freight forwarders
- Contains: vessel name, BL number, LOT reference, freight charges
- Extract: lotNumber, freightCost, currency

### 3. BILLS OF LADING / BOLs (bol)
- Shipping documents showing cargo details
- Contains: shipper, consignee, vessel, port of loading/discharge, ETA, commodity description
- Extract: lotNumber, supplierName, clientName, commodity, eta

### 4. CLEARING & TRANSPORT INVOICES (invoice)
- Local South African charges for customs clearing and inland transport
- Contains: clearing agent fees, customs duties, transport costs (usually in ZAR)
- Extract: lotNumber, clearingCost, transportCost, currency (ZAR)

### 5. CLIENT INVOICES (invoice)
- Our invoice to South African clients
- Amount is in ZAR (South African Rand)
- Contains: client name, LOT reference, commodity, total amount
- Extract: lotNumber, clientName, clientInvoiceZar

### 6. PAYMENT RECORDS (payment)
- Bank statements, payment confirmations, SWIFT messages
- Contains: supplier name, amount paid, currency, FX rate, bank charges
- Extract: supplierName, paymentAmount, currency, fxRate, bankCharges, paymentDate

### 7. CSV/EXCEL DATA (shipment/invoice/payment)
- Bulk data exports with multiple rows
- Identify column headers and map to our data structure
- Each row typically represents one shipment or transaction
- Common columns: LOT, Supplier, Client, Amount, Date, Status, Currency

## PROFIT CALCULATION LOGIC (for reference)
- Total Foreign = Supplier Cost + Freight Cost + Clearing Cost + Transport Cost
- Total ZAR = Total Foreign × Applied FX Rate
- Gross Profit = Client Invoice ZAR - Total ZAR
- FX Commission = Total ZAR × 1.4%
- FX Spread Profit = Total Foreign × (Spot Rate - Applied Rate)
- Net Profit = Gross Profit + FX Commission + FX Spread Profit - Bank Charges
- Profit Margin = (Net Profit / Client Invoice ZAR) × 100%

## EXTRACTION RULES
1. LOT numbers: Look for "LOT", "Lot", "LOT#", "Shipment", "Reference" followed by numbers (e.g., "LOT 881", "881", "Lot-881")
2. Currency: If amounts mention "$" or "USD" → USD, "€" or "EUR" → EUR, "R" or "ZAR" → ZAR
3. Dates: Convert to YYYY-MM-DD format (e.g., "15 Jan 2024" → "2024-01-15")
4. Amounts: Extract as numbers without currency symbols or thousand separators
5. Supplier matching: Match to known suppliers (WINTEX, AMAGGI, COFCO, etc.) even if name varies slightly

## RESPONSE FORMAT
Always respond with valid JSON (no markdown code blocks):
{
  "documentType": "invoice|bol|packing_list|payment|shipment|supplier|client|unknown",
  "summary": "Brief summary: what document is this, from whom, for what shipment, key amounts",
  "extractedData": {
    "lotNumber": "string - the LOT/shipment reference number (e.g., '881', 'LOT 881')",
    "supplierName": "string - overseas supplier name",
    "clientName": "string - South African client name",
    "commodity": "string - product description (e.g., 'Sunflower Oil', 'Wheat', 'Sugar')",
    "invoiceNumber": "string - invoice/document reference number",
    "supplierCost": "number - cost of goods from supplier in foreign currency",
    "freightCost": "number - shipping/freight charges",
    "clearingCost": "number - customs clearing charges",
    "transportCost": "number - inland transport charges",
    "currency": "USD|EUR|ZAR - currency of the foreign amounts",
    "clientInvoiceZar": "number - amount invoiced to client in ZAR",
    "fxRate": "number - FX rate applied (e.g., 18.50 for USD/ZAR)",
    "fxSpotRate": "number - market spot rate at time of transaction",
    "bankCharges": "number - bank fees in ZAR",
    "paymentAmount": "number - payment amount made",
    "paymentDate": "YYYY-MM-DD - date of payment",
    "eta": "YYYY-MM-DD - estimated arrival date",
    "deliveryDate": "YYYY-MM-DD - actual delivery date",
    "status": "pending|in-transit|documents-submitted|completed"
  },
  "bulkData": [
    // For CSVs: array of records, each with same structure as extractedData
  ],
  "issues": [
    // List any problems: missing LOT numbers, unclear amounts, currency confusion, data inconsistencies
  ],
  "actionItems": [
    // Suggested follow-ups: "Verify supplier cost with original invoice", "Missing client invoice - needs to be added"
  ],
  "confidence": "high|medium|low"
}

## CONFIDENCE LEVELS
- HIGH: Clear document, all key fields extracted, matches known patterns
- MEDIUM: Some fields unclear or missing, but main data extracted
- LOW: Ambiguous document, significant data missing, or unfamiliar format

Use null for any field that cannot be determined from the document.`;

// Query assistant prompt for answering questions about the database
function getQueryAssistantPrompt(): string {
  return `You are the AI assistant for Favorite Logistics, a South African freight forwarding company. You have access to the company's live database and can answer questions about shipments, suppliers, clients, payments, and financial performance.

## YOUR CAPABILITIES
- Answer questions about shipments (LOT numbers, status, dates, costs, profits)
- Provide financial summaries (total profit, revenue, margins)
- Report on supplier balances and payment schedules
- Give client-specific information (orders, revenue, outstanding amounts)
- Calculate metrics like total profit for periods, average margins, etc.
- Generate CSV exports of any data upon request
- Look up documents and records related to specific queries

## RESPONSE FORMAT
Always respond in a clear, conversational manner. Use formatting to make data easy to read:
- Use bullet points for lists
- Use R/ZAR for South African Rand amounts (e.g., R 250,000.00)
- Use $ for USD and € for EUR
- Include relevant totals and percentages
- Be specific with numbers - don't round excessively

## CSV EXPORT REQUESTS
When the user asks for a CSV, spreadsheet, export, or download of data:
1. Include ALL the relevant data in your response
2. At the END of your response, add a special CSV block formatted EXACTLY like this:

\`\`\`csv
column1,column2,column3
value1,value2,value3
\`\`\`

The CSV should contain ALL matching records with relevant columns.

## EXAMPLE RESPONSES
- "This month's total profit is R 301,371.85 across 4 shipments"
- "WINTEX has an outstanding balance of $35,000.00"
- "LOT 881 has a profit margin of 11.74%"
- For CSV requests: "Here are all shipments for SANJITH..." followed by the csv block

If asked about data you don't have, say so clearly. Don't make up numbers.`;
}

// Detect if user input is a question vs a document
function detectQuestion(content: string): boolean {
  const trimmed = content.trim().toLowerCase();
  
  // Question indicators
  const questionPatterns = [
    /^(how|what|when|where|who|why|which|can|could|would|is|are|do|does|did|have|has|show|tell|give|list|get|find|search|check|update|status|profit|revenue|balance|payment|shipment|lot|client|supplier)/i,
    /\?$/,
    /^(total|sum|count|average|avg|monthly|weekly|daily|this month|this week|today|yesterday)/i,
  ];
  
  // Document indicators (long content, structured data, CSV-like)
  const isLikelyDocument = content.length > 500 || 
    content.includes('\t') || 
    content.includes(',') && content.includes('\n') ||
    content.match(/invoice|bill of lading|bol|packing list|freight|shipment details/i);
  
  if (isLikelyDocument && !content.includes('?')) {
    return false;
  }
  
  return questionPatterns.some(pattern => pattern.test(trimmed));
}

// Fetch current database context for question answering
async function fetchDatabaseContext(supabase: any): Promise<string> {
  let context = '';
  
  try {
    // Fetch shipments with costs
    const { data: shipments } = await supabase
      .from('shipments')
      .select(`
        id, lot_number, commodity, status, eta, created_at,
        supplier:suppliers(name, currency),
        client:clients(name),
        costs:shipment_costs(
          supplier_cost, freight_cost, clearing_cost, transport_cost,
          total_foreign, total_zar, client_invoice_zar,
          gross_profit_zar, net_profit_zar, profit_margin,
          fx_applied_rate, source_currency
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (shipments && shipments.length > 0) {
      context += '## SHIPMENTS\n';
      let totalProfit = 0;
      let totalRevenue = 0;
      
      for (const s of shipments) {
        const profit = s.costs?.net_profit_zar || 0;
        const revenue = s.costs?.client_invoice_zar || 0;
        totalProfit += profit;
        totalRevenue += revenue;
        
        context += `- LOT ${s.lot_number}: ${s.commodity || 'N/A'} | Status: ${s.status} | Supplier: ${s.supplier?.name || 'N/A'} | Client: ${s.client?.name || 'N/A'} | Revenue: R ${revenue.toLocaleString()} | Net Profit: R ${profit.toLocaleString()} | Margin: ${(s.costs?.profit_margin || 0).toFixed(1)}%\n`;
      }
      
      context += `\n**TOTALS:** ${shipments.length} shipments | Total Revenue: R ${totalRevenue.toLocaleString()} | Total Profit: R ${totalProfit.toLocaleString()}\n\n`;
    }

    // Fetch suppliers with balances
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, currency, current_balance')
      .order('name');

    if (suppliers && suppliers.length > 0) {
      context += '## SUPPLIERS\n';
      for (const sup of suppliers) {
        if (sup.current_balance > 0) {
          context += `- ${sup.name}: ${sup.currency} ${sup.current_balance.toLocaleString()} owed\n`;
        }
      }
      context += '\n';
    }

    // Fetch clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, contact_person')
      .order('name');

    if (clients && clients.length > 0) {
      context += '## CLIENTS\n';
      for (const c of clients) {
        context += `- ${c.name}${c.contact_person ? ` (${c.contact_person})` : ''}\n`;
      }
      context += '\n';
    }

    // Fetch pending payments
    const { data: payments } = await supabase
      .from('payment_schedule')
      .select(`
        id, amount_foreign, amount_zar, currency, status, payment_date,
        supplier:suppliers(name)
      `)
      .eq('status', 'pending')
      .order('payment_date');

    if (payments && payments.length > 0) {
      context += '## PENDING PAYMENTS\n';
      let totalPending = 0;
      for (const p of payments) {
        totalPending += p.amount_zar || 0;
        context += `- ${p.supplier?.name}: ${p.currency} ${p.amount_foreign.toLocaleString()} (R ${(p.amount_zar || 0).toLocaleString()}) due ${p.payment_date}\n`;
      }
      context += `\n**Total Pending:** R ${totalPending.toLocaleString()}\n\n`;
    }

    // Add current date for context
    context += `## CURRENT DATE: ${new Date().toISOString().split('T')[0]}\n`;

  } catch (error) {
    console.error('Error fetching database context:', error);
    context = 'Error fetching database data.';
  }

  return context;
}


interface ExtractedData {
  lotNumber?: string | null;
  supplierName?: string | null;
  clientName?: string | null;
  commodity?: string | null;
  invoiceNumber?: string | null;
  supplierCost?: number | null;
  freightCost?: number | null;
  clearingCost?: number | null;
  transportCost?: number | null;
  currency?: string | null;
  clientInvoiceZar?: number | null;
  fxRate?: number | null;
  fxSpotRate?: number | null;
  bankCharges?: number | null;
  paymentAmount?: number | null;
  paymentDate?: string | null;
  eta?: string | null;
  deliveryDate?: string | null;
  status?: string | null;
}

interface AnalysisResult {
  documentType: string;
  summary: string;
  extractedData: ExtractedData;
  bulkData?: ExtractedData[];
  issues: string[];
  actionItems: string[];
  confidence: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentContent, documentName, sendToTelegram = false, autoImport = false, isChatMode = false } = await req.json();

    if (!documentContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Document content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service is not configured. Please enable Lovable AI in project settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing document: ${documentName || 'unnamed'}`);
    console.log(`Document content length: ${documentContent.length} characters`);
    console.log(`Auto-import enabled: ${autoImport}`);
    console.log(`Chat mode: ${isChatMode}`);

    // Check if this is a question about data (not a document)
    const isQuestion = detectQuestion(documentContent);
    console.log(`Is question: ${isQuestion}`);

    // If it's a question, fetch database context first
    let databaseContext = '';
    if (isQuestion && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        databaseContext = await fetchDatabaseContext(supabase);
        console.log('Fetched database context for question answering');
      } catch (dbError) {
        console.error('Error fetching database context:', dbError);
      }
    }

    // Build appropriate prompt based on whether this is a question or document
    let userPrompt: string;
    let systemPrompt: string;

    if (isQuestion && databaseContext) {
      systemPrompt = getQueryAssistantPrompt();
      userPrompt = `## CURRENT DATABASE DATA\n${databaseContext}\n\n## USER QUESTION\n${documentContent}`;
    } else {
      systemPrompt = SYSTEM_PROMPT;
      userPrompt = `Analyze this document and extract structured data:\n\nDocument Name: ${documentName || 'Unknown'}\n\nContent:\n${documentContent}`;
    }

    // Call Lovable AI Gateway for analysis
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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI service is rate limited. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI usage limit reached. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `AI analysis failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const rawAnalysis = aiData.choices?.[0]?.message?.content || '';

    console.log('Raw analysis length:', rawAnalysis.length);

    // If this was a question, return the response directly
    if (isQuestion && databaseContext) {
      // Check if response contains CSV data
      let csvData: string | null = null;
      const csvMatch = rawAnalysis.match(/```csv\n([\s\S]*?)```/);
      if (csvMatch) {
        csvData = csvMatch[1].trim();
      }

      return new Response(
        JSON.stringify({
          success: true,
          analysis: rawAnalysis.replace(/```csv\n[\s\S]*?```/g, '').trim(), // Remove CSV block from display
          isQueryResponse: true,
          csvData, // Include CSV data separately for download
          documentName: null,
          analyzedAt: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse the JSON response for document analysis
    let analysisResult: AnalysisResult;
    try {
      // Extract JSON from the response (handle markdown code blocks if present)
      let jsonStr = rawAnalysis.trim();
      
      // Remove markdown code blocks if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      analysisResult = JSON.parse(jsonStr.trim());
      console.log('Successfully parsed analysis result');
    } catch (parseError) {
      console.error('Failed to parse analysis as JSON:', parseError);
      console.log('Raw response (first 500 chars):', rawAnalysis.substring(0, 500));
      
      // Return raw analysis if JSON parsing fails
      analysisResult = {
        documentType: 'unknown',
        summary: rawAnalysis.substring(0, 500),
        extractedData: {},
        issues: ['Failed to parse structured data from AI response'],
        actionItems: ['Please try uploading the document again or provide clearer content'],
        confidence: 'low'
      };
    }

    // Auto-import data if enabled
    let importResult = null;
    if (autoImport && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        importResult = await importData(supabase, analysisResult);
        console.log('Import result:', importResult);
      } catch (importError) {
        console.error('Import error:', importError);
        importResult = { success: false, message: 'Failed to import data' };
      }
    }

    console.log('Analysis completed successfully');

    // Format human-readable analysis for display
    const humanReadableAnalysis = formatAnalysisForDisplay(analysisResult);

    // Send to Telegram if configured and requested
    let telegramSent = false;
    if (sendToTelegram && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        const telegramMessage = `📄 *Document Analysis*\n\n📁 *File:* ${documentName || 'Unknown'}\n📊 *Type:* ${analysisResult.documentType}\n🎯 *Confidence:* ${analysisResult.confidence}\n\n${analysisResult.summary}\n\n${importResult ? `✅ *Auto-imported:* ${importResult.message}` : ''}`;
        
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: telegramMessage.substring(0, 4096),
              parse_mode: 'Markdown',
            }),
          }
        );

        if (telegramResponse.ok) {
          telegramSent = true;
          console.log('Analysis sent to Telegram successfully');
        } else {
          const telegramError = await telegramResponse.text();
          console.error('Telegram API error:', telegramError);
        }
      } catch (telegramError) {
        console.error('Error sending to Telegram:', telegramError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: humanReadableAnalysis,
        structuredData: analysisResult,
        importResult,
        documentName,
        telegramSent,
        analyzedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in analyze-document function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function formatAnalysisForDisplay(result: AnalysisResult): string {
  let output = `📋 DOCUMENT ANALYSIS\n${'='.repeat(40)}\n\n`;
  output += `📊 Type: ${result.documentType.toUpperCase()}\n`;
  output += `🎯 Confidence: ${result.confidence}\n\n`;
  output += `📝 Summary:\n${result.summary}\n\n`;
  
  if (Object.keys(result.extractedData).length > 0) {
    output += `📦 Extracted Data:\n${'-'.repeat(20)}\n`;
    for (const [key, value] of Object.entries(result.extractedData)) {
      if (value !== null && value !== undefined) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        output += `• ${label}: ${value}\n`;
      }
    }
    output += '\n';
  }

  if (result.bulkData && result.bulkData.length > 0) {
    output += `📊 Bulk Data (${result.bulkData.length} records found)\n${'-'.repeat(20)}\n`;
    result.bulkData.slice(0, 5).forEach((record, i) => {
      output += `\nRecord ${i + 1}:\n`;
      for (const [key, value] of Object.entries(record)) {
        if (value !== null && value !== undefined) {
          output += `  • ${key}: ${value}\n`;
        }
      }
    });
    if (result.bulkData.length > 5) {
      output += `\n... and ${result.bulkData.length - 5} more records\n`;
    }
    output += '\n';
  }

  if (result.issues.length > 0) {
    output += `⚠️ Issues Found:\n${'-'.repeat(20)}\n`;
    result.issues.forEach(issue => {
      output += `• ${issue}\n`;
    });
    output += '\n';
  }

  if (result.actionItems.length > 0) {
    output += `✅ Action Items:\n${'-'.repeat(20)}\n`;
    result.actionItems.forEach(item => {
      output += `• ${item}\n`;
    });
  }

  return output;
}

async function importData(supabase: any, analysis: AnalysisResult): Promise<{ success: boolean; message: string; details?: any; createdRecords?: any }> {
  const { documentType, extractedData, bulkData } = analysis;
  const results: any[] = [];
  const createdRecords = {
    shipments: 0,
    costs: 0,
    payments: 0,
    suppliers: 0,
    clients: 0
  };

  try {
    // Handle single record import
    if (extractedData && Object.keys(extractedData).length > 0) {
      const result = await importSingleRecord(supabase, documentType, extractedData, createdRecords);
      if (result) results.push(result);
    }

    // Handle bulk data import
    if (bulkData && bulkData.length > 0) {
      for (const record of bulkData) {
        const result = await importSingleRecord(supabase, documentType, record, createdRecords);
        if (result) results.push(result);
      }
    }

    if (results.length === 0) {
      return { success: false, message: 'No data to import' };
    }

    const summary = [];
    if (createdRecords.shipments) summary.push(`${createdRecords.shipments} shipment(s)`);
    if (createdRecords.costs) summary.push(`${createdRecords.costs} cost record(s)`);
    if (createdRecords.payments) summary.push(`${createdRecords.payments} payment(s)`);
    if (createdRecords.suppliers) summary.push(`${createdRecords.suppliers} supplier(s)`);
    if (createdRecords.clients) summary.push(`${createdRecords.clients} client(s)`);

    return { 
      success: true, 
      message: summary.length > 0 ? `Created: ${summary.join(', ')}` : `Processed ${results.length} record(s)`,
      details: results,
      createdRecords
    };
  } catch (error) {
    console.error('Import error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Import failed' 
    };
  }
}

async function importSingleRecord(supabase: any, documentType: string, data: ExtractedData, createdRecords: any): Promise<any> {
  // Find or create supplier
  let supplierId = null;
  if (data.supplierName) {
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', data.supplierName)
      .single();

    if (existingSupplier) {
      supplierId = existingSupplier.id;
    } else {
      const { data: newSupplier, error } = await supabase
        .from('suppliers')
        .insert({ 
          name: data.supplierName,
          currency: data.currency || 'USD'
        })
        .select('id')
        .single();
      
      if (newSupplier) {
        supplierId = newSupplier.id;
        createdRecords.suppliers++;
      }
    }
  }

  // Find or create client
  let clientId = null;
  if (data.clientName) {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', data.clientName)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const { data: newClient } = await supabase
        .from('clients')
        .insert({ name: data.clientName })
        .select('id')
        .single();
      
      if (newClient) {
        clientId = newClient.id;
        createdRecords.clients++;
      }
    }
  }

  // Handle shipment creation/update
  if (data.lotNumber) {
    const { data: existingShipment } = await supabase
      .from('shipments')
      .select('id')
      .eq('lot_number', data.lotNumber)
      .single();

    let shipmentId = existingShipment?.id;

    if (!shipmentId) {
      const { data: newShipment, error } = await supabase
        .from('shipments')
        .insert({
          lot_number: data.lotNumber,
          supplier_id: supplierId,
          client_id: clientId,
          commodity: data.commodity,
          eta: data.eta,
          delivery_date: data.deliveryDate,
          status: data.status || 'pending',
        })
        .select('id')
        .single();

      if (newShipment) {
        shipmentId = newShipment.id;
        createdRecords.shipments++;
      }
    }

    // Handle costs
    if (shipmentId && (data.supplierCost || data.freightCost || data.clearingCost || data.transportCost || data.clientInvoiceZar)) {
      const { data: existingCosts } = await supabase
        .from('shipment_costs')
        .select('id')
        .eq('shipment_id', shipmentId)
        .single();

      const costData = {
        shipment_id: shipmentId,
        supplier_cost: data.supplierCost || 0,
        freight_cost: data.freightCost || 0,
        clearing_cost: data.clearingCost || 0,
        transport_cost: data.transportCost || 0,
        client_invoice_zar: data.clientInvoiceZar || 0,
        fx_spot_rate: data.fxSpotRate || 18.5,
        fx_applied_rate: data.fxRate || 18.5,
        bank_charges: data.bankCharges || 0,
        source_currency: data.currency || 'USD',
      };

      if (existingCosts) {
        await supabase
          .from('shipment_costs')
          .update(costData)
          .eq('id', existingCosts.id);
      } else {
        const { error } = await supabase
          .from('shipment_costs')
          .insert(costData);
        
        if (!error) {
          createdRecords.costs++;
        }
      }
    }

    // Handle payments
    if (data.paymentAmount && data.paymentDate && supplierId) {
      const { error } = await supabase
        .from('payment_schedule')
        .insert({
          supplier_id: supplierId,
          shipment_id: shipmentId,
          amount_foreign: data.paymentAmount,
          currency: data.currency || 'USD',
          fx_rate: data.fxRate || 18.5,
          payment_date: data.paymentDate,
          status: 'pending',
        });

      if (!error) {
        createdRecords.payments++;
      }
    }

    return { lotNumber: data.lotNumber, shipmentId, supplierId, clientId };
  }

  return null;
}
