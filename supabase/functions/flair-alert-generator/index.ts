import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Alert rules configuration
const ALERT_RULES = {
  high_supplier_balance: {
    warning_threshold: 50000,
    urgent_threshold: 100000,
    message: (name: string, balance: number, currency: string) =>
      `${name} balance is ${currency} ${balance.toLocaleString()}. Consider scheduling payment.`
  },
  overdue_telex: {
    warning_days: 3,
    urgent_days: 7,
    message: (lot: string, days: number) =>
      `LOT ${lot} arrived ${days} days ago but telex not released. Contact bank.`
  },
  payment_due_soon: {
    warning_days: 2,
    message: (supplier: string, amount: number, date: string) =>
      `Payment of $${amount.toLocaleString()} to ${supplier} due ${date}.`
  },
  low_margin_shipment: {
    warning_threshold: 10,
    urgent_threshold: 5,
    message: (lot: string, margin: number) =>
      `LOT ${lot} has ${margin.toFixed(1)}% margin. Review pricing for future orders.`
  },
  stale_shipment: {
    days: 7,
    message: (lot: string, status: string, days: number) =>
      `LOT ${lot} stuck in "${status}" for ${days} days. Update status or check with agent.`
  },
  missing_client_invoice: {
    message: (lot: string) =>
      `LOT ${lot} delivered but no client invoice recorded. Generate invoice.`
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const alertsCreated: any[] = [];
  const alertsResolved: any[] = [];

  try {
    console.log('[Alert Generator] Starting alert scan...');

    // =========================================================================
    // RULE 1: High Supplier Balance
    // =========================================================================
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, currency, current_balance')
      .gt('current_balance', ALERT_RULES.high_supplier_balance.warning_threshold);

    for (const sup of suppliers || []) {
      const severity = sup.current_balance >= ALERT_RULES.high_supplier_balance.urgent_threshold
        ? 'urgent' : 'warning';

      await createAlertIfNotExists(supabase, {
        alert_type: 'high_supplier_balance',
        severity,
        title: `High Balance: ${sup.name}`,
        message: ALERT_RULES.high_supplier_balance.message(sup.name, sup.current_balance, sup.currency),
        entity_type: 'supplier',
        entity_id: sup.id,
        entity_reference: sup.name,
        action_required: true,
        suggested_action: 'Schedule payment or review outstanding invoices'
      }, alertsCreated);
    }

    // Auto-resolve if balance dropped
    await resolveStaleAlerts(supabase, 'high_supplier_balance', 'supplier',
      suppliers?.map(s => s.id) || [], alertsResolved);

    // =========================================================================
    // RULE 2: Overdue Telex Release
    // =========================================================================
    const { data: overdueTelex } = await supabase
      .from('shipments')
      .select('id, lot_number, eta, status, telex_released')
      .eq('telex_released', false)
      .in('status', ['arrived', 'clearing', 'in-transit'])
      .not('eta', 'is', null);

    for (const ship of overdueTelex || []) {
      const daysSince = Math.floor((Date.now() - new Date(ship.eta).getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince >= ALERT_RULES.overdue_telex.warning_days) {
        const severity = daysSince >= ALERT_RULES.overdue_telex.urgent_days ? 'urgent' : 'warning';

        await createAlertIfNotExists(supabase, {
          alert_type: 'overdue_telex',
          severity,
          title: `Telex Overdue: LOT ${ship.lot_number}`,
          message: ALERT_RULES.overdue_telex.message(ship.lot_number, daysSince),
          entity_type: 'shipment',
          entity_id: ship.id,
          entity_reference: ship.lot_number,
          action_required: true,
          suggested_action: 'Contact bank about telex release'
        }, alertsCreated);
      }
    }

    // Auto-resolve telex alerts when telex is released
    const { data: releasedTelex } = await supabase
      .from('shipments')
      .select('id')
      .eq('telex_released', true);

    await resolveStaleAlerts(supabase, 'overdue_telex', 'shipment',
      releasedTelex?.map(s => s.id) || [], alertsResolved, true);

    // =========================================================================
    // RULE 3: Payment Due Soon
    // =========================================================================
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + ALERT_RULES.payment_due_soon.warning_days);

    const { data: dueSoon } = await supabase
      .from('payment_schedule')
      .select('id, supplier_id, amount_foreign, currency, payment_date, suppliers(name)')
      .eq('status', 'pending')
      .lte('payment_date', twoDaysFromNow.toISOString().split('T')[0]);

    for (const pay of dueSoon || []) {
      const isOverdue = new Date(pay.payment_date) < new Date();

      await createAlertIfNotExists(supabase, {
        alert_type: 'payment_due_soon',
        severity: isOverdue ? 'urgent' : 'warning',
        title: isOverdue ? `Payment OVERDUE: ${(pay.suppliers as any)?.name}` : `Payment Due: ${(pay.suppliers as any)?.name}`,
        message: ALERT_RULES.payment_due_soon.message(
          (pay.suppliers as any)?.name || 'Unknown',
          pay.amount_foreign,
          pay.payment_date
        ),
        entity_type: 'payment',
        entity_id: pay.id,
        entity_reference: `${(pay.suppliers as any)?.name} - ${pay.payment_date}`,
        action_required: true,
        suggested_action: isOverdue ? 'Process payment immediately' : 'Prepare payment'
      }, alertsCreated);
    }

    // =========================================================================
    // RULE 4: Low Margin Shipments
    // =========================================================================
    const { data: lowMargin } = await supabase
      .from('v_shipments_full')
      .select('id, lot_number, profit_margin, client_invoice_zar')
      .lt('profit_margin', ALERT_RULES.low_margin_shipment.warning_threshold)
      .gt('client_invoice_zar', 0)
      .not('profit_margin', 'is', null);

    for (const ship of lowMargin || []) {
      const severity = ship.profit_margin < ALERT_RULES.low_margin_shipment.urgent_threshold
        ? 'warning' : 'info';

      await createAlertIfNotExists(supabase, {
        alert_type: 'low_margin_shipment',
        severity,
        title: `Low Margin: LOT ${ship.lot_number}`,
        message: ALERT_RULES.low_margin_shipment.message(ship.lot_number, ship.profit_margin),
        entity_type: 'shipment',
        entity_id: ship.id,
        entity_reference: ship.lot_number,
        action_required: false,
        suggested_action: 'Review pricing for future orders from this supplier'
      }, alertsCreated);
    }

    // =========================================================================
    // RULE 5: Stale Shipments
    // =========================================================================
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - ALERT_RULES.stale_shipment.days);

    const { data: stale } = await supabase
      .from('shipments')
      .select('id, lot_number, status, updated_at')
      .not('status', 'in', '("completed","cancelled")')
      .lt('updated_at', sevenDaysAgo.toISOString());

    for (const ship of stale || []) {
      const daysSince = Math.floor((Date.now() - new Date(ship.updated_at).getTime()) / (1000 * 60 * 60 * 24));

      await createAlertIfNotExists(supabase, {
        alert_type: 'stale_shipment',
        severity: 'info',
        title: `Stale: LOT ${ship.lot_number}`,
        message: ALERT_RULES.stale_shipment.message(ship.lot_number, ship.status, daysSince),
        entity_type: 'shipment',
        entity_id: ship.id,
        entity_reference: ship.lot_number,
        action_required: false,
        suggested_action: 'Check status and update'
      }, alertsCreated);
    }

    // =========================================================================
    // RULE 6: Missing Client Invoice
    // =========================================================================
    const { data: noInvoice } = await supabase
      .from('v_shipments_full')
      .select('id, lot_number')
      .eq('status', 'delivered')
      .or('client_invoice_zar.is.null,client_invoice_zar.eq.0');

    for (const ship of noInvoice || []) {
      await createAlertIfNotExists(supabase, {
        alert_type: 'missing_client_invoice',
        severity: 'warning',
        title: `No Invoice: LOT ${ship.lot_number}`,
        message: ALERT_RULES.missing_client_invoice.message(ship.lot_number),
        entity_type: 'shipment',
        entity_id: ship.id,
        entity_reference: ship.lot_number,
        action_required: true,
        suggested_action: 'Generate and record client invoice'
      }, alertsCreated);
    }

    // Auto-resolve if invoice added
    const { data: withInvoice } = await supabase
      .from('v_shipments_full')
      .select('id')
      .gt('client_invoice_zar', 0);

    await resolveStaleAlerts(supabase, 'missing_client_invoice', 'shipment',
      withInvoice?.map(s => s.id) || [], alertsResolved, true);

    // =========================================================================
    // SEND NOTIFICATIONS VIA FLAIR-NOTIFY FOR NEW ALERTS
    // =========================================================================
    if (alertsCreated.length > 0) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      // Filter for warning and above severity
      const notifyAlerts = alertsCreated.filter(a => 
        ['warning', 'urgent', 'critical'].includes(a.severity)
      );

      for (const alert of notifyAlerts) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/flair-notify`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'alert',
              alert_id: alert.id,
              title: alert.title,
              message: alert.message + (alert.suggested_action ? `\n\n💡 ${alert.suggested_action}` : ''),
              priority: alert.severity === 'critical' ? 'high' : 'normal'
            })
          });
          console.log(`[Alert Generator] Notification sent for: ${alert.type}`);
        } catch (e) {
          console.error(`[Alert Generator] Failed to notify for ${alert.type}:`, e);
        }
      }
    }

    // Log summary
    console.log(`[Alert Generator] Created: ${alertsCreated.length}, Resolved: ${alertsResolved.length}`);

    return new Response(JSON.stringify({
      success: true,
      alerts_created: alertsCreated.length,
      alerts_resolved: alertsResolved.length,
      details: { created: alertsCreated, resolved: alertsResolved }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[Alert Generator] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// Helper: Create alert if doesn't already exist
async function createAlertIfNotExists(supabase: any, alert: any, created: any[]) {
  // Check for existing active alert of same type for same entity
  const { data: existing } = await supabase
    .from('proactive_alerts')
    .select('id')
    .eq('alert_type', alert.alert_type)
    .eq('entity_id', alert.entity_id)
    .eq('status', 'active')
    .maybeSingle();

  if (!existing) {
    const { data, error } = await supabase
      .from('proactive_alerts')
      .insert(alert)
      .select()
      .single();

    if (!error && data) {
      created.push({ 
        type: alert.alert_type, 
        entity: alert.entity_reference,
        title: alert.title,
        message: alert.message,
        severity: alert.severity
      });
    }
  }
}

// Helper: Resolve alerts for entities that no longer match condition
async function resolveStaleAlerts(
  supabase: any,
  alertType: string,
  entityType: string,
  validIds: string[],
  resolved: any[],
  resolveIfInList: boolean = false
) {
  let query = supabase
    .from('proactive_alerts')
    .select('id, entity_reference')
    .eq('alert_type', alertType)
    .eq('entity_type', entityType)
    .eq('status', 'active');

  const { data: toResolve } = await query;

  for (const alert of toResolve || []) {
    // If resolveIfInList is true, resolve alerts where entity IS in validIds (condition fixed)
    // Otherwise, resolve alerts where entity is NOT in validIds (condition no longer applies)
    const shouldResolve = resolveIfInList 
      ? validIds.includes(alert.entity_id)
      : !validIds.includes(alert.entity_id);

    if (shouldResolve || validIds.length === 0) {
      await supabase
        .from('proactive_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: 'Auto-resolved: condition no longer applies'
        })
        .eq('id', alert.id);

      resolved.push({ type: alertType, entity: alert.entity_reference });
    }
  }
}
