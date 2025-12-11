import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const validateApiKey = (req: Request): boolean => {
  const authHeader = req.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');
  const validKey = Deno.env.get('N8N_API_KEY');
  return apiKey === validKey;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let requestBody: any = {};

  try {
    if (!validateApiKey(req)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    requestBody = await req.json();
    const { supplier_name, source = 'whatsapp' } = requestBody;

    if (!supplier_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: supplier_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('*')
      .ilike('name', `%${supplier_name}%`)
      .single();

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ success: false, error: `Supplier "${supplier_name}" not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('supplier_ledger')
      .select('*, shipments(lot_number)')
      .eq('supplier_id', supplier.id)
      .order('transaction_date', { ascending: false })
      .limit(5);

    const formatCurrency = (amount: number, currency: string) => {
      const symbol = currency === 'ZAR' ? 'R' : currency === 'EUR' ? '€' : '$';
      return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Build WhatsApp message
    let whatsappMessage = `📊 ${supplier.name.toUpperCase()} BALANCE\n\n`;
    
    const balance = supplier.current_balance || 0;
    const balanceStatus = balance > 0 ? '🔴 Owed to supplier' : balance < 0 ? '🟢 Supplier owes us' : '⚪ Zero balance';
    
    whatsappMessage += `💰 Balance: ${formatCurrency(Math.abs(balance), supplier.currency)}\n`;
    whatsappMessage += `${balanceStatus}\n`;
    whatsappMessage += `💱 Currency: ${supplier.currency}\n\n`;

    if (transactions && transactions.length > 0) {
      whatsappMessage += `📝 RECENT TRANSACTIONS:\n`;
      transactions.forEach(t => {
        const sign = t.ledger_type === 'debit' ? '+' : '-';
        const icon = t.ledger_type === 'debit' ? '📥' : '📤';
        whatsappMessage += `${icon} ${sign}${formatCurrency(t.amount, supplier.currency)}`;
        if (t.shipments?.lot_number) whatsappMessage += ` (LOT ${t.shipments.lot_number})`;
        whatsappMessage += `\n   ${t.transaction_date}\n`;
      });
    }

    const response = {
      success: true,
      supplier: {
        name: supplier.name,
        currency: supplier.currency,
        current_balance: supplier.current_balance,
        recent_transactions: transactions || []
      },
      message: `Balance for ${supplier.name}`,
      whatsapp_message: whatsappMessage
    };

    await supabase.from('automation_logs').insert({
      source,
      action: 'query_supplier_balance',
      lot_number: null,
      request_body: requestBody,
      response: { supplier_name: supplier.name, balance: supplier.current_balance },
      success: true
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    const error = err as Error;
    console.error('Error in suppliers-balance:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      whatsapp_message: `❌ Failed to get balance: ${error.message}`
    };

    await supabase.from('automation_logs').insert({
      source: requestBody.source || 'unknown',
      action: 'query_supplier_balance',
      lot_number: null,
      request_body: requestBody,
      response: errorResponse,
      success: false,
      error: error.message
    });

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
