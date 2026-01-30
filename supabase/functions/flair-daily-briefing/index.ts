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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { briefing_type = 'morning' } = await req.json().catch(() => ({}));
    console.log(`[FLAIR Briefing] Generating ${briefing_type} briefing...`);
    
    // Load comprehensive context using optimized RPC functions
    const monthStart = getMonthStart();
    
    const [shipmentsResult, suppliersResult, paymentsResult, alertsResult, mtdResult] = await Promise.all([
      supabase.rpc('get_shipments_with_age', { limit_count: 100 }),
      supabase.rpc('get_suppliers_summary'),
      supabase.rpc('get_pending_payments_with_urgency'),
      supabase.from('proactive_alerts').select('*').eq('status', 'active'),
      supabase.rpc('get_mtd_totals', { month_start: monthStart })
    ]);

    const context = {
      shipments: shipmentsResult.data || [],
      suppliers: suppliersResult.data || [],
      payments: paymentsResult.data || [],
      alerts: alertsResult.data || [],
      mtd: mtdResult.data?.[0] || { total_revenue: 0, total_profit: 0, shipment_count: 0 }
    };

    // Generate briefing
    const briefing = generateBriefing(context, briefing_type);

    // Send via notification system
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const notifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/flair-notify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'briefing',
        title: briefing_type === 'morning' ? '☀️ Morning Briefing' : '🌙 Evening Summary',
        message: briefing
      })
    });

    const notifyResult = await notifyResponse.json();
    console.log(`[FLAIR Briefing] Notification result:`, notifyResult);

    // Log the briefing
    await supabase.from('automation_logs').insert({
      source: 'flair-briefing',
      action: `daily_${briefing_type}_briefing`,
      success: true,
      response: { 
        message_length: briefing.length,
        notifications_sent: notifyResult.sent_count || 0
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      briefing_type,
      briefing,
      notifications: notifyResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[FLAIR Briefing] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function generateBriefing(ctx: any, type: string): string {
  const lines: string[] = [];
  const today = new Date().toLocaleDateString('en-ZA', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'short',
    timeZone: 'Africa/Johannesburg'
  });

  lines.push(`📅 ${today}\n`);

  // Active Alerts
  if (ctx.alerts.length > 0) {
    lines.push(`⚠️ ${ctx.alerts.length} Active Alert${ctx.alerts.length > 1 ? 's' : ''}`);
    const urgent = ctx.alerts.filter((a: any) => ['urgent', 'critical'].includes(a.severity));
    if (urgent.length > 0) {
      urgent.slice(0, 3).forEach((a: any) => lines.push(`  🔴 ${a.title}`));
    }
    lines.push('');
  }

  // Shipment Overview
  const active = ctx.shipments.filter((s: any) => !['completed', 'cancelled'].includes(s.status));
  const byStatus: Record<string, number> = {};
  active.forEach((s: any) => {
    byStatus[s.status] = (byStatus[s.status] || 0) + 1;
  });

  lines.push(`📦 ${active.length} Active Shipments`);
  const statusIcons: Record<string, string> = { 
    pending: '⏳', 
    'in-transit': '🚢', 
    arrived: '🛬', 
    clearing: '📋',
    'documents-submitted': '📄',
    delivered: '✅' 
  };
  Object.entries(byStatus).forEach(([status, count]) => {
    const icon = statusIcons[status] || '❓';
    lines.push(`  ${icon} ${status}: ${count}`);
  });
  lines.push('');

  // Payments Due
  const overdue = ctx.payments.filter((p: any) => p.is_overdue);
  const dueSoon = ctx.payments.filter((p: any) => !p.is_overdue && p.days_until_due <= 3);

  if (overdue.length > 0) {
    lines.push(`🚨 ${overdue.length} OVERDUE Payment${overdue.length > 1 ? 's' : ''}`);
    overdue.slice(0, 3).forEach((p: any) => {
      lines.push(`  • ${p.supplier_name}: ${p.currency} ${Number(p.amount).toLocaleString()}`);
    });
    lines.push('');
  }

  if (dueSoon.length > 0) {
    lines.push(`💳 ${dueSoon.length} Payment${dueSoon.length > 1 ? 's' : ''} Due Soon`);
    dueSoon.slice(0, 3).forEach((p: any) => {
      lines.push(`  • ${p.supplier_name}: ${p.currency} ${Number(p.amount).toLocaleString()} (${p.due_date})`);
    });
    lines.push('');
  }

  // Supplier Balances
  const topBalances = ctx.suppliers.filter((s: any) => s.current_balance > 10000).slice(0, 5);
  if (topBalances.length > 0) {
    const total = topBalances.reduce((sum: number, s: any) => sum + s.current_balance, 0);
    lines.push(`💰 Top Balances (Total: $${total.toLocaleString()})`);
    topBalances.forEach((s: any) => {
      lines.push(`  • ${s.name}: ${s.currency} ${s.current_balance.toLocaleString()}`);
    });
    lines.push('');
  }

  // MTD Performance (evening only or if significant)
  if ((type === 'evening' || ctx.mtd.shipment_count > 0) && ctx.mtd.total_revenue > 0) {
    const margin = ctx.mtd.total_revenue > 0 
      ? ((ctx.mtd.total_profit / ctx.mtd.total_revenue) * 100).toFixed(1) 
      : '0';
    
    lines.push(`📊 MTD Performance`);
    lines.push(`  • Completed: ${ctx.mtd.shipment_count} shipments`);
    lines.push(`  • Revenue: R ${Number(ctx.mtd.total_revenue).toLocaleString()}`);
    lines.push(`  • Profit: R ${Number(ctx.mtd.total_profit).toLocaleString()} (${margin}%)`);
    lines.push('');
  }

  // Needs Attention
  const needsAttention: string[] = [];
  
  const noTelex = ctx.shipments.filter((s: any) => 
    ['arrived', 'clearing'].includes(s.status) && !s.telex_released && (s.days_since_eta || 0) > 2
  );
  if (noTelex.length > 0) {
    needsAttention.push(`${noTelex.length} awaiting telex release`);
  }

  const noDocs = ctx.shipments.filter((s: any) => 
    ['in-transit', 'arrived'].includes(s.status) && !s.document_submitted
  );
  if (noDocs.length > 0) {
    needsAttention.push(`${noDocs.length} missing documents`);
  }

  if (needsAttention.length > 0) {
    lines.push(`⚡ Needs Attention`);
    needsAttention.forEach(item => lines.push(`  • ${item}`));
    lines.push('');
  }

  lines.push(`Reply with any question or command`);

  return lines.join('\n');
}
