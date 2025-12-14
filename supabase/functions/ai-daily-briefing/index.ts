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
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !DEEPSEEK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body for briefing type (morning/evening)
    let briefingType = 'morning';
    try {
      const body = await req.json();
      briefingType = body.type || 'morning';
    } catch {
      // Default to morning
    }

    console.log(`Generating ${briefingType} briefing...`);

    // Fetch all relevant data
    const briefingData = await fetchBriefingData(supabase);
    
    // Generate AI-powered briefing
    const briefingPrompt = generateBriefingPrompt(briefingData, briefingType);
    
    const aiResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `You are the AI assistant for Favorite Logistics. Generate a concise ${briefingType} briefing with emojis. Format for Telegram (use <b> for bold, <i> for italic). Be actionable and highlight important items.` },
          { role: 'user', content: briefingPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', errorText);
      throw new Error('AI service error');
    }

    const aiData = await aiResponse.json();
    const briefingMessage = aiData.choices?.[0]?.message?.content || generateFallbackBriefing(briefingData, briefingType);

    // Send to Telegram
    await sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, briefingMessage);

    // Log the briefing
    await supabase.from('automation_logs').insert({
      source: 'ai-briefing',
      action: `daily_${briefingType}_briefing`,
      success: true,
      response: { message_length: briefingMessage.length }
    });

    return new Response(JSON.stringify({ success: true, briefingType, message: briefingMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-daily-briefing:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchBriefingData(supabase: any) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [
    shipmentsResult,
    pendingPaymentsResult,
    suppliersResult,
    recentActivityResult,
    arrivingThisWeekResult,
  ] = await Promise.all([
    // All active shipments
    supabase.from('v_shipments_full').select('*').neq('status', 'completed').order('eta', { ascending: true }),
    // Pending payments
    supabase.from('v_pending_payments').select('*').eq('status', 'pending').order('payment_date'),
    // Suppliers with balances
    supabase.from('suppliers').select('*').neq('current_balance', 0),
    // Recent activity (last 24h)
    supabase.from('activity_logs').select('*').gte('created_at', yesterday).order('created_at', { ascending: false }).limit(20),
    // Shipments arriving this week
    supabase.from('v_shipments_full').select('*').lte('eta', nextWeek).gte('eta', today).neq('status', 'completed'),
  ]);

  // Calculate metrics
  const shipments = shipmentsResult.data || [];
  const pendingPayments = pendingPaymentsResult.data || [];
  const suppliers = suppliersResult.data || [];
  const recentActivity = recentActivityResult.data || [];
  const arrivingThisWeek = arrivingThisWeekResult.data || [];

  const totalOwedToSuppliers = suppliers.filter((s: any) => s.current_balance > 0).reduce((sum: number, s: any) => sum + s.current_balance, 0);
  const overduePayments = pendingPayments.filter((p: any) => new Date(p.payment_date) < new Date());
  const pendingShipments = shipments.filter((s: any) => s.status === 'pending');
  const inTransit = shipments.filter((s: any) => s.status === 'in-transit');
  const awaitingDocuments = shipments.filter((s: any) => s.status === 'documents-submitted');

  return {
    shipments,
    pendingPayments,
    suppliers,
    recentActivity,
    arrivingThisWeek,
    metrics: {
      totalActive: shipments.length,
      pending: pendingShipments.length,
      inTransit: inTransit.length,
      awaitingDocuments: awaitingDocuments.length,
      arrivingThisWeek: arrivingThisWeek.length,
      overduePayments: overduePayments.length,
      totalOwedToSuppliers,
      totalPendingPaymentAmount: pendingPayments.reduce((sum: number, p: any) => sum + (p.amount_foreign || 0), 0),
    },
    overduePayments,
    pendingShipments,
    inTransit,
  };
}

function generateBriefingPrompt(data: any, type: string): string {
  const { metrics, overduePayments, arrivingThisWeek, pendingPayments, suppliers } = data;
  
  let prompt = `Generate a ${type === 'morning' ? 'morning' : 'end-of-day'} briefing for Favorite Logistics.\n\n`;
  
  prompt += `## Current State:\n`;
  prompt += `- Active Shipments: ${metrics.totalActive}\n`;
  prompt += `- Pending: ${metrics.pending}\n`;
  prompt += `- In Transit: ${metrics.inTransit}\n`;
  prompt += `- Awaiting Clearance: ${metrics.awaitingDocuments}\n`;
  prompt += `- Arriving This Week: ${metrics.arrivingThisWeek}\n\n`;

  prompt += `## Financial:\n`;
  prompt += `- Overdue Payments: ${metrics.overduePayments}\n`;
  prompt += `- Total Pending Payment Amount: $${metrics.totalPendingPaymentAmount.toLocaleString()}\n`;
  prompt += `- Total Owed to Suppliers: $${metrics.totalOwedToSuppliers.toLocaleString()}\n\n`;

  if (overduePayments.length > 0) {
    prompt += `## ⚠️ OVERDUE PAYMENTS:\n`;
    overduePayments.forEach((p: any) => {
      prompt += `- ${p.supplier_name}: ${p.currency} ${p.amount_foreign} (due ${p.payment_date})\n`;
    });
    prompt += '\n';
  }

  if (arrivingThisWeek.length > 0) {
    prompt += `## 📦 ARRIVING THIS WEEK:\n`;
    arrivingThisWeek.forEach((s: any) => {
      prompt += `- LOT ${s.lot_number}: ${s.supplier_name} → ${s.client_name} (ETA: ${s.eta})\n`;
    });
    prompt += '\n';
  }

  if (suppliers.filter((s: any) => s.current_balance > 50000).length > 0) {
    prompt += `## 💰 HIGH SUPPLIER BALANCES:\n`;
    suppliers.filter((s: any) => s.current_balance > 50000).forEach((s: any) => {
      prompt += `- ${s.name}: ${s.currency} ${s.current_balance.toLocaleString()}\n`;
    });
    prompt += '\n';
  }

  prompt += `Generate a ${type === 'morning' ? 'motivating morning overview with priorities for the day' : 'summary of the day with key accomplishments and tomorrow priorities'}.`;
  
  return prompt;
}

function generateFallbackBriefing(data: any, type: string): string {
  const { metrics, overduePayments, arrivingThisWeek } = data;
  const emoji = type === 'morning' ? '🌅' : '🌙';
  
  let msg = `${emoji} <b>${type === 'morning' ? 'Good Morning' : 'Evening Summary'} - Favorite Logistics</b>\n\n`;
  
  msg += `📊 <b>Active Shipments:</b> ${metrics.totalActive}\n`;
  msg += `• Pending: ${metrics.pending}\n`;
  msg += `• In Transit: ${metrics.inTransit}\n`;
  msg += `• Clearing: ${metrics.awaitingDocuments}\n\n`;

  if (metrics.overduePayments > 0) {
    msg += `⚠️ <b>Overdue Payments:</b> ${metrics.overduePayments}\n`;
    overduePayments.slice(0, 3).forEach((p: any) => {
      msg += `• ${p.supplier_name}: ${p.currency} ${Number(p.amount_foreign).toLocaleString()}\n`;
    });
    msg += '\n';
  }

  if (arrivingThisWeek.length > 0) {
    msg += `📦 <b>Arriving This Week:</b> ${arrivingThisWeek.length}\n`;
    arrivingThisWeek.slice(0, 3).forEach((s: any) => {
      msg += `• LOT ${s.lot_number} (${s.eta})\n`;
    });
  }

  return msg;
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!response.ok) {
    console.error('Telegram send error:', await response.text());
  }
  return response.ok;
}
