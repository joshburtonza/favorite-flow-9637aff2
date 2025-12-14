import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entity?: { type: string; id: string; name: string };
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log('Running proactive alerts check...');

    // Collect all alerts
    const alerts: Alert[] = [];

    // 1. Check for delayed shipments (ETA passed but not completed)
    const { data: delayedShipments } = await supabase
      .from('v_shipments_full')
      .select('*')
      .lt('eta', new Date().toISOString().split('T')[0])
      .neq('status', 'completed');

    if (delayedShipments && delayedShipments.length > 0) {
      delayedShipments.forEach((s: any) => {
        const daysOverdue = Math.floor((Date.now() - new Date(s.eta).getTime()) / 86400000);
        alerts.push({
          type: 'shipment_delayed',
          severity: daysOverdue > 7 ? 'critical' : 'warning',
          title: `LOT ${s.lot_number} Delayed`,
          message: `${daysOverdue} days overdue. ETA was ${s.eta}. Status: ${s.status}`,
          entity: { type: 'shipment', id: s.id, name: s.lot_number },
          data: { daysOverdue, eta: s.eta, status: s.status }
        });
      });
    }

    // 2. Check for overdue payments
    const { data: overduePayments } = await supabase
      .from('v_pending_payments')
      .select('*')
      .eq('status', 'pending')
      .lt('payment_date', new Date().toISOString().split('T')[0]);

    if (overduePayments && overduePayments.length > 0) {
      overduePayments.forEach((p: any) => {
        const daysOverdue = Math.floor((Date.now() - new Date(p.payment_date).getTime()) / 86400000);
        alerts.push({
          type: 'payment_overdue',
          severity: daysOverdue > 5 ? 'critical' : 'warning',
          title: `Payment Overdue: ${p.supplier_name}`,
          message: `${p.currency} ${Number(p.amount_foreign).toLocaleString()} due ${p.payment_date} (${daysOverdue} days overdue)`,
          entity: { type: 'payment', id: p.id, name: p.supplier_name },
          data: { daysOverdue, amount: p.amount_foreign, currency: p.currency }
        });
      });
    }

    // 3. Check for shipments missing documents (status in-transit for >5 days without docs)
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    const { data: missingDocs } = await supabase
      .from('shipments')
      .select('id, lot_number, status, document_submitted, created_at')
      .eq('status', 'in-transit')
      .eq('document_submitted', false)
      .lt('created_at', fiveDaysAgo);

    if (missingDocs && missingDocs.length > 0) {
      missingDocs.forEach((s: any) => {
        alerts.push({
          type: 'missing_documents',
          severity: 'warning',
          title: `Missing Documents: LOT ${s.lot_number}`,
          message: `In-transit for ${Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000)} days without document submission`,
          entity: { type: 'shipment', id: s.id, name: s.lot_number },
        });
      });
    }

    // 4. Check for high supplier balances (>$100k)
    const { data: highBalanceSuppliers } = await supabase
      .from('suppliers')
      .select('id, name, currency, current_balance')
      .gt('current_balance', 100000);

    if (highBalanceSuppliers && highBalanceSuppliers.length > 0) {
      highBalanceSuppliers.forEach((s: any) => {
        alerts.push({
          type: 'high_supplier_balance',
          severity: 'info',
          title: `High Balance: ${s.name}`,
          message: `${s.currency} ${Number(s.current_balance).toLocaleString()} owed to supplier`,
          entity: { type: 'supplier', id: s.id, name: s.name },
          data: { balance: s.current_balance, currency: s.currency }
        });
      });
    }

    // 5. Check for incomplete shipment costs (shipment exists but no costs recorded)
    const { data: shipmentsCosts } = await supabase
      .from('v_shipments_full')
      .select('id, lot_number, supplier_cost, client_invoice_zar, status')
      .neq('status', 'pending')
      .is('supplier_cost', null);

    if (shipmentsCosts && shipmentsCosts.length > 0) {
      shipmentsCosts.forEach((s: any) => {
        alerts.push({
          type: 'missing_costs',
          severity: 'warning',
          title: `Missing Costs: LOT ${s.lot_number}`,
          message: `Shipment is ${s.status} but has no supplier cost recorded`,
          entity: { type: 'shipment', id: s.id, name: s.lot_number },
        });
      });
    }

    // 6. Check for shipments without client invoice (completed without invoice)
    const { data: noInvoice } = await supabase
      .from('v_shipments_full')
      .select('id, lot_number, client_invoice_zar, status')
      .eq('status', 'completed')
      .is('client_invoice_zar', null);

    if (noInvoice && noInvoice.length > 0) {
      noInvoice.forEach((s: any) => {
        alerts.push({
          type: 'missing_client_invoice',
          severity: 'critical',
          title: `No Invoice: LOT ${s.lot_number}`,
          message: `Completed shipment has no client invoice recorded`,
          entity: { type: 'shipment', id: s.id, name: s.lot_number },
        });
      });
    }

    // Store alerts in admin_notifications
    if (alerts.length > 0) {
      const notifications = alerts.map(alert => ({
        title: alert.title,
        message: alert.message,
        notification_type: alert.type,
        severity: alert.severity,
        metadata: { entity: alert.entity, data: alert.data }
      }));

      await supabase.from('admin_notifications').insert(notifications);
    }

    // Send critical alerts to Telegram
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const telegramMessage = formatAlertsForTelegram(criticalAlerts);
      await sendTelegramMessage(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, telegramMessage);
    }

    // Log the alert check
    await supabase.from('automation_logs').insert({
      source: 'ai-proactive-alerts',
      action: 'alert_check',
      success: true,
      response: { 
        total_alerts: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      alerts_count: alerts.length,
      alerts: alerts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-proactive-alerts:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatAlertsForTelegram(alerts: Alert[]): string {
  let msg = `🚨 <b>CRITICAL ALERTS</b>\n\n`;
  
  alerts.forEach(alert => {
    const emoji = getAlertEmoji(alert.type);
    msg += `${emoji} <b>${alert.title}</b>\n`;
    msg += `${alert.message}\n\n`;
  });

  msg += `<i>Check dashboard for details.</i>`;
  return msg;
}

function getAlertEmoji(type: string): string {
  const emojis: Record<string, string> = {
    shipment_delayed: '🚢⏰',
    payment_overdue: '💰❗',
    missing_documents: '📄❓',
    high_supplier_balance: '💵📈',
    missing_costs: '💲❓',
    missing_client_invoice: '🧾❌',
  };
  return emojis[type] || '⚠️';
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
