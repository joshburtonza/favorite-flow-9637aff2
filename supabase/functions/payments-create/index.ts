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
    const { 
      supplier_name, 
      lot_number,
      amount_foreign,
      currency = 'USD',
      fx_rate,
      bank_account,
      payment_date,
      reference,
      source = 'whatsapp'
    } = requestBody;

    if (!supplier_name || !amount_foreign || !fx_rate) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: supplier_name, amount_foreign, fx_rate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find supplier
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('id, name, current_balance')
      .ilike('name', `%${supplier_name}%`)
      .single();

    if (supplierError || !supplier) {
      return new Response(
        JSON.stringify({ success: false, error: `Supplier "${supplier_name}" not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find shipment if lot_number provided
    let shipment = null;
    if (lot_number) {
      const { data } = await supabase
        .from('shipments')
        .select('id')
        .eq('lot_number', lot_number)
        .single();
      shipment = data;
    }

    // Find bank account if provided
    let bankAccountId = null;
    if (bank_account) {
      const { data: bank } = await supabase
        .from('bank_accounts')
        .select('id')
        .ilike('name', `%${bank_account}%`)
        .single();
      bankAccountId = bank?.id;
    }

    const amountZar = amount_foreign * fx_rate;
    const commissionEarned = amountZar * 0.014; // 1.4% commission

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payment_schedule')
      .insert({
        supplier_id: supplier.id,
        shipment_id: shipment?.id || null,
        amount_foreign,
        amount_zar: amountZar,
        currency,
        fx_rate,
        bank_account_id: bankAccountId,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        paid_date: new Date().toISOString().split('T')[0],
        status: 'completed',
        commission_earned: commissionEarned,
        notes: reference ? `Reference: ${reference}` : null
      })
      .select()
      .single();

    if (paymentError) throw new Error(`Failed to create payment: ${paymentError.message}`);

    // Create supplier ledger credit entry
    await supabase.from('supplier_ledger').insert({
      supplier_id: supplier.id,
      shipment_id: shipment?.id || null,
      ledger_type: 'credit',
      amount: amount_foreign,
      description: `Payment via ${bank_account || 'unknown'} - ${reference || 'N/A'}`,
      transaction_date: new Date().toISOString().split('T')[0]
    });

    // Get updated supplier balance
    const { data: updatedSupplier } = await supabase
      .from('suppliers')
      .select('current_balance')
      .eq('id', supplier.id)
      .single();

    const formatCurrency = (amount: number, curr: string) => {
      const symbol = curr === 'ZAR' ? 'R' : curr === 'EUR' ? '€' : '$';
      return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const response = {
      success: true,
      payment_id: payment.id,
      supplier_balance: updatedSupplier?.current_balance || 0,
      commission_earned: commissionEarned,
      message: `Payment created for ${supplier.name}`,
      whatsapp_message: `✅ PAYMENT RECORDED\n\n💳 ${supplier.name}\n💰 Amount: ${formatCurrency(amount_foreign, currency)}\n📊 FX Rate: ${fx_rate}\n💵 ZAR Value: ${formatCurrency(amountZar, 'ZAR')}\n🏦 Bank: ${bank_account || 'N/A'}\n${lot_number ? `📦 LOT: ${lot_number}\n` : ''}\n💱 Commission: ${formatCurrency(commissionEarned, 'ZAR')}\n\n📊 Updated Balance: ${formatCurrency(updatedSupplier?.current_balance || 0, currency)}`
    };

    await supabase.from('automation_logs').insert({
      source,
      action: 'create_payment',
      lot_number: lot_number || null,
      request_body: requestBody,
      response,
      success: true
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    const error = err as Error;
    console.error('Error in payments-create:', error);
    
    const errorResponse = {
      success: false,
      error: error.message,
      whatsapp_message: `❌ Failed to create payment: ${error.message}`
    };

    await supabase.from('automation_logs').insert({
      source: requestBody.source || 'unknown',
      action: 'create_payment',
      lot_number: requestBody.lot_number,
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
