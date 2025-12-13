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
Always respond with valid JSON:
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
    const { documentContent, documentName, sendToTelegram = true, autoImport = false } = await req.json();

    if (!documentContent) {
      throw new Error('Document content is required');
    }

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    console.log(`Analyzing document: ${documentName || 'unnamed'}`);
    console.log(`Document content length: ${documentContent.length} characters`);
    console.log(`Auto-import enabled: ${autoImport}`);

    // Call DeepSeek API for analysis
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this document and extract structured data:\n\nDocument Name: ${documentName || 'Unknown'}\n\nContent:\n${documentContent}` }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      console.error('DeepSeek API error:', errorText);
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const deepseekData = await deepseekResponse.json();
    const rawAnalysis = deepseekData.choices?.[0]?.message?.content || '';

    console.log('Raw analysis:', rawAnalysis);

    // Parse the JSON response
    let analysisResult: AnalysisResult;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = rawAnalysis.match(/```json\s*([\s\S]*?)\s*```/) || rawAnalysis.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawAnalysis;
      analysisResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse analysis as JSON:', parseError);
      // Return raw analysis if JSON parsing fails
      analysisResult = {
        documentType: 'unknown',
        summary: rawAnalysis,
        extractedData: {},
        issues: ['Failed to parse structured data'],
        actionItems: [],
        confidence: 'low'
      };
    }

    // Auto-import data if enabled
    let importResult = null;
    if (autoImport && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      importResult = await importData(supabase, analysisResult);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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

async function importData(supabase: any, analysis: AnalysisResult): Promise<{ success: boolean; message: string; details?: any }> {
  const { documentType, extractedData, bulkData } = analysis;
  const results: any[] = [];

  try {
    // Handle single record import
    if (extractedData && Object.keys(extractedData).length > 0) {
      const result = await importSingleRecord(supabase, documentType, extractedData);
      if (result) results.push(result);
    }

    // Handle bulk data import
    if (bulkData && bulkData.length > 0) {
      for (const record of bulkData) {
        const result = await importSingleRecord(supabase, documentType, record);
        if (result) results.push(result);
      }
    }

    if (results.length === 0) {
      return { success: false, message: 'No data to import' };
    }

    return { 
      success: true, 
      message: `Imported ${results.length} record(s)`,
      details: results 
    };
  } catch (error) {
    console.error('Import error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Import failed' 
    };
  }
}

async function importSingleRecord(supabase: any, documentType: string, data: ExtractedData): Promise<any> {
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
      
      if (newSupplier) supplierId = newSupplier.id;
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
      
      if (newClient) clientId = newClient.id;
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
          status: 'pending'
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating shipment:', error);
      } else {
        shipmentId = newShipment?.id;
      }
    } else {
      // Update existing shipment
      await supabase
        .from('shipments')
        .update({
          supplier_id: supplierId || undefined,
          client_id: clientId || undefined,
          commodity: data.commodity || undefined,
          eta: data.eta || undefined,
          delivery_date: data.deliveryDate || undefined,
        })
        .eq('id', shipmentId);
    }

    // Handle costs if present
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
        bank_charges: data.bankCharges || 0,
        source_currency: data.currency || 'USD',
        fx_applied_rate: data.fxRate || 0,
        fx_spot_rate: data.fxRate || 0,
      };

      if (existingCosts) {
        await supabase
          .from('shipment_costs')
          .update(costData)
          .eq('id', existingCosts.id);
      } else {
        await supabase
          .from('shipment_costs')
          .insert(costData);
      }

      // Create supplier ledger entry for costs
      if (supplierId && data.supplierCost) {
        await supabase
          .from('supplier_ledger')
          .insert({
            supplier_id: supplierId,
            shipment_id: shipmentId,
            ledger_type: 'debit',
            amount: data.supplierCost,
            description: `Invoice for LOT ${data.lotNumber}`,
            invoice_number: data.invoiceNumber,
          });
      }
    }

    return { type: 'shipment', lotNumber: data.lotNumber, shipmentId };
  }

  // Handle payment records
  if (documentType === 'payment' && data.paymentAmount && supplierId) {
    const { data: payment, error } = await supabase
      .from('payment_schedule')
      .insert({
        supplier_id: supplierId,
        amount_foreign: data.paymentAmount,
        currency: data.currency || 'USD',
        fx_rate: data.fxRate || 0,
        payment_date: data.paymentDate || new Date().toISOString().split('T')[0],
        status: 'pending'
      })
      .select('id')
      .single();

    return { type: 'payment', paymentId: payment?.id };
  }

  return null;
}
