import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Suggestion {
  type: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: string;
  entity?: { type: string; id: string; name: string };
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!DEEPSEEK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request - can be for specific entity or general
    let context = 'general';
    let entityType = null;
    let entityId = null;
    try {
      const body = await req.json();
      context = body.context || 'general';
      entityType = body.entityType;
      entityId = body.entityId;
    } catch {
      // Default to general
    }

    console.log(`Generating smart suggestions for context: ${context}`);

    const suggestions: Suggestion[] = [];

    // Fetch relevant data
    const [shipmentsResult, suppliersResult, paymentsResult, costsAnalysis] = await Promise.all([
      supabase.from('v_shipments_full').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('suppliers').select('*'),
      supabase.from('v_pending_payments').select('*').eq('status', 'pending'),
      supabase.from('v_shipments_full').select('lot_number, supplier_name, supplier_cost, freight_cost, clearing_cost, profit_margin, source_currency').not('supplier_cost', 'is', null),
    ]);

    const shipments = shipmentsResult.data || [];
    const suppliers = suppliersResult.data || [];
    const pendingPayments = paymentsResult.data || [];
    const costs = costsAnalysis.data || [];

    // 1. Cost anomaly detection - compare against averages
    const avgCosts = calculateAverageCosts(costs);
    costs.forEach((s: any) => {
      if (s.supplier_cost && avgCosts.avgSupplierCost > 0) {
        const deviation = ((s.supplier_cost - avgCosts.avgSupplierCost) / avgCosts.avgSupplierCost) * 100;
        if (deviation > 25) {
          suggestions.push({
            type: 'cost_anomaly',
            priority: deviation > 40 ? 'high' : 'medium',
            title: `High Supplier Cost: LOT ${s.lot_number}`,
            description: `Supplier cost is ${deviation.toFixed(0)}% above average ($${s.supplier_cost.toLocaleString()} vs avg $${avgCosts.avgSupplierCost.toLocaleString()})`,
            action: 'Review supplier pricing or negotiate',
            entity: { type: 'shipment', id: s.lot_number, name: s.lot_number },
            data: { cost: s.supplier_cost, average: avgCosts.avgSupplierCost, deviation }
          });
        }
      }

      if (s.freight_cost && avgCosts.avgFreightCost > 0) {
        const deviation = ((s.freight_cost - avgCosts.avgFreightCost) / avgCosts.avgFreightCost) * 100;
        if (deviation > 30) {
          suggestions.push({
            type: 'freight_anomaly',
            priority: 'medium',
            title: `High Freight Cost: LOT ${s.lot_number}`,
            description: `Freight cost is ${deviation.toFixed(0)}% above average ($${s.freight_cost.toLocaleString()} vs avg $${avgCosts.avgFreightCost.toLocaleString()})`,
            action: 'Compare shipping rates',
            entity: { type: 'shipment', id: s.lot_number, name: s.lot_number },
            data: { cost: s.freight_cost, average: avgCosts.avgFreightCost, deviation }
          });
        }
      }

      // Low profit margin warning
      if (s.profit_margin !== null && s.profit_margin < 5) {
        suggestions.push({
          type: 'low_margin',
          priority: s.profit_margin < 2 ? 'high' : 'medium',
          title: `Low Profit Margin: LOT ${s.lot_number}`,
          description: `Only ${s.profit_margin.toFixed(1)}% margin. Review costs and pricing.`,
          action: 'Increase client invoice or reduce costs',
          entity: { type: 'shipment', id: s.lot_number, name: s.lot_number },
          data: { margin: s.profit_margin }
        });
      }
    });

    // 2. Payment optimization suggestions
    const supplierPaymentGroups: Record<string, any[]> = {};
    pendingPayments.forEach((p: any) => {
      if (!supplierPaymentGroups[p.supplier_name]) {
        supplierPaymentGroups[p.supplier_name] = [];
      }
      supplierPaymentGroups[p.supplier_name].push(p);
    });

    Object.entries(supplierPaymentGroups).forEach(([supplier, payments]) => {
      if (payments.length >= 3) {
        const total = payments.reduce((sum, p) => sum + (p.amount_foreign || 0), 0);
        suggestions.push({
          type: 'batch_payment',
          priority: 'medium',
          title: `Consolidate Payments: ${supplier}`,
          description: `${payments.length} pending payments totaling ${payments[0]?.currency || 'USD'} ${total.toLocaleString()}. Consider consolidating to save on bank fees.`,
          action: 'Create single payment for multiple shipments',
          entity: { type: 'supplier', id: supplier, name: supplier },
          data: { paymentCount: payments.length, total }
        });
      }
    });

    // 3. Supplier diversification suggestions
    const supplierShipmentCount: Record<string, number> = {};
    shipments.forEach((s: any) => {
      if (s.supplier_name) {
        supplierShipmentCount[s.supplier_name] = (supplierShipmentCount[s.supplier_name] || 0) + 1;
      }
    });

    const totalShipments = shipments.length;
    Object.entries(supplierShipmentCount).forEach(([supplier, count]) => {
      const percentage = (count / totalShipments) * 100;
      if (percentage > 50 && totalShipments > 5) {
        suggestions.push({
          type: 'supplier_concentration',
          priority: 'low',
          title: `High Supplier Concentration: ${supplier}`,
          description: `${percentage.toFixed(0)}% of shipments are from ${supplier}. Consider diversifying supplier base.`,
          action: 'Explore alternative suppliers',
          entity: { type: 'supplier', id: supplier, name: supplier },
          data: { percentage, count, total: totalShipments }
        });
      }
    });

    // 4. Document follow-up suggestions
    const needsFollowUp = shipments.filter((s: any) => 
      s.status === 'in-transit' && !s.document_submitted
    );
    
    if (needsFollowUp.length > 0) {
      suggestions.push({
        type: 'document_followup',
        priority: 'medium',
        title: `${needsFollowUp.length} Shipments Awaiting Documents`,
        description: `Follow up with suppliers for: ${needsFollowUp.slice(0, 3).map((s: any) => s.lot_number).join(', ')}${needsFollowUp.length > 3 ? '...' : ''}`,
        action: 'Send document request to suppliers',
        data: { shipments: needsFollowUp.map((s: any) => s.lot_number) }
      });
    }

    // 5. FX Rate optimization (if rates seem off)
    const fxShipments = costs.filter((s: any) => s.source_currency === 'USD');
    if (fxShipments.length > 0) {
      // Would compare against live FX rates - for now, just flag if spread seems high
      suggestions.push({
        type: 'fx_review',
        priority: 'low',
        title: 'Review FX Rates',
        description: 'Consider reviewing current FX rates and spreads for optimal conversion timing.',
        action: 'Check latest USD/ZAR rates',
      });
    }

    // Use AI to generate additional insights if we have meaningful data
    if (shipments.length >= 5 && DEEPSEEK_API_KEY) {
      try {
        const aiSuggestions = await getAISuggestions(DEEPSEEK_API_KEY, {
          shipmentCount: shipments.length,
          avgMargin: avgCosts.avgMargin,
          pendingPayments: pendingPayments.length,
          topSuppliers: Object.entries(supplierShipmentCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
        });
        
        if (aiSuggestions) {
          suggestions.push(...aiSuggestions);
        }
      } catch (e) {
        console.error('AI suggestions error:', e);
      }
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions_count: suggestions.length,
      suggestions: suggestions.slice(0, 20) // Limit to top 20
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-smart-suggestions:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateAverageCosts(costs: any[]): { avgSupplierCost: number; avgFreightCost: number; avgClearingCost: number; avgMargin: number } {
  const validCosts = costs.filter(c => c.supplier_cost > 0);
  if (validCosts.length === 0) {
    return { avgSupplierCost: 0, avgFreightCost: 0, avgClearingCost: 0, avgMargin: 0 };
  }

  return {
    avgSupplierCost: validCosts.reduce((sum, c) => sum + (c.supplier_cost || 0), 0) / validCosts.length,
    avgFreightCost: validCosts.filter(c => c.freight_cost > 0).reduce((sum, c, _, arr) => sum + (c.freight_cost || 0) / arr.length, 0),
    avgClearingCost: validCosts.filter(c => c.clearing_cost > 0).reduce((sum, c, _, arr) => sum + (c.clearing_cost || 0) / arr.length, 0),
    avgMargin: validCosts.filter(c => c.profit_margin !== null).reduce((sum, c, _, arr) => sum + (c.profit_margin || 0) / arr.length, 0),
  };
}

async function getAISuggestions(apiKey: string, data: any): Promise<Suggestion[]> {
  const prompt = `Based on this freight forwarding business data, provide 2-3 actionable business suggestions:
  
- Total shipments: ${data.shipmentCount}
- Average profit margin: ${data.avgMargin.toFixed(1)}%
- Pending payments: ${data.pendingPayments}
- Top suppliers: ${data.topSuppliers.map(([name, count]: [string, number]) => `${name} (${count} shipments)`).join(', ')}

Return JSON array with format: [{"type": "suggestion_type", "priority": "high|medium|low", "title": "Short title", "description": "Details", "action": "What to do"}]`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a freight forwarding business analyst. Provide actionable insights in JSON format.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) return [];

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content || '';
  
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Ignore parse errors
  }
  
  return [];
}
