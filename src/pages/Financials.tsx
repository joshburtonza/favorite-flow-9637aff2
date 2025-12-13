import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  CreditCard,
  BarChart3,
  LineChart
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDashboardRealtime } from '@/hooks/useRealtimeSubscription';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CHART_COLORS = [
  'hsl(239, 84%, 67%)',   // Primary
  'hsl(187, 94%, 43%)',   // Accent
  'hsl(160, 84%, 39%)',   // Success
  'hsl(45, 93%, 47%)',    // Warning
  'hsl(271, 91%, 65%)',   // Purple
];

export default function Financials() {
  useDashboardRealtime();

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: async () => {
      const { data: shipments, error } = await supabase
        .from('v_shipments_full')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      const completedShipments = shipments?.filter(s => s.status === 'completed') || [];
      const activeShipments = shipments?.filter(s => s.status !== 'completed') || [];
      
      const totalRevenue = shipments?.reduce((sum, s) => sum + (s.client_invoice_zar || 0), 0) || 0;
      const totalCostsZar = shipments?.reduce((sum, s) => sum + (s.total_zar || 0), 0) || 0;
      const totalGrossProfit = shipments?.reduce((sum, s) => sum + (s.gross_profit_zar || 0), 0) || 0;
      const totalNetProfit = shipments?.reduce((sum, s) => sum + (s.net_profit_zar || 0), 0) || 0;
      const totalFxCommission = shipments?.reduce((sum, s) => sum + (s.fx_commission_zar || 0), 0) || 0;
      const totalSpreadProfit = shipments?.reduce((sum, s) => sum + (s.fx_spread_profit_zar || 0), 0) || 0;
      const totalBankCharges = shipments?.reduce((sum, s) => sum + (s.bank_charges || 0), 0) || 0;
      
      const avgProfitMargin = shipments?.length 
        ? (shipments.reduce((sum, s) => sum + (s.profit_margin || 0), 0) / shipments.length)
        : 0;

      const { data: pendingPayments } = await supabase
        .from('payment_schedule')
        .select('amount_zar')
        .eq('status', 'pending');
      
      const totalPendingPayments = pendingPayments?.reduce((sum, p) => sum + (p.amount_zar || 0), 0) || 0;

      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('current_balance');
      
      const totalOwedToSuppliers = suppliers?.reduce((sum, s) => sum + Math.max(0, s.current_balance), 0) || 0;

      // Prepare chart data
      const profitTrendData = shipments?.map(s => ({
        name: `LOT ${s.lot_number}`,
        revenue: s.client_invoice_zar || 0,
        costs: s.total_zar || 0,
        profit: s.net_profit_zar || 0,
        date: s.created_at,
      })) || [];

      const profitBreakdownData = [
        { name: 'Gross Profit', value: Math.max(0, totalGrossProfit), color: CHART_COLORS[2] },
        { name: 'FX Commission', value: Math.max(0, totalFxCommission), color: CHART_COLORS[1] },
        { name: 'Spread Profit', value: Math.max(0, totalSpreadProfit), color: CHART_COLORS[4] },
      ].filter(d => d.value > 0);

      const marginByShipment = shipments?.map(s => ({
        name: `LOT ${s.lot_number}`,
        margin: s.profit_margin || 0,
      })) || [];

      return {
        shipments: shipments || [],
        completedCount: completedShipments.length,
        activeCount: activeShipments.length,
        totalRevenue,
        totalCostsZar,
        totalGrossProfit,
        totalNetProfit,
        totalFxCommission,
        totalSpreadProfit,
        totalBankCharges,
        avgProfitMargin,
        totalPendingPayments,
        totalOwedToSuppliers,
        profitTrendData,
        profitBreakdownData,
        marginByShipment,
      };
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <header className="animate-slide-in">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Financial Overview</p>
            <h1 className="text-3xl font-semibold gradient-text">Financials</h1>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" style={{ background: 'hsl(var(--muted))' }} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const data = financialData!;

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <header className="animate-slide-in">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Financial Overview</p>
          <h1 className="text-3xl font-semibold gradient-text">Financials</h1>
        </header>

        {/* Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(data.totalRevenue, 'ZAR', { compact: true })}
            icon={DollarSign}
            trend="up"
            description={`${data.completedCount + data.activeCount} shipments`}
          />
          <MetricCard
            title="Total Costs"
            value={formatCurrency(data.totalCostsZar, 'ZAR', { compact: true })}
            icon={CreditCard}
            description="All shipment costs"
          />
          <MetricCard
            title="Net Profit"
            value={formatCurrency(data.totalNetProfit, 'ZAR', { compact: true })}
            icon={TrendingUp}
            trend={data.totalNetProfit > 0 ? 'up' : 'down'}
            highlight
            description="After all deductions"
          />
          <MetricCard
            title="Avg Profit Margin"
            value={`${data.avgProfitMargin.toFixed(1)}%`}
            icon={Percent}
            trend={data.avgProfitMargin > 5 ? 'up' : 'down'}
            description="Across all shipments"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Costs Trend */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              Revenue vs Costs Trend
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.profitTrendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(187, 94%, 43%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(187, 94%, 43%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => formatCurrency(value, 'ZAR')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(239, 84%, 67%)" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="costs" 
                    stroke="hsl(187, 94%, 43%)" 
                    fillOpacity={1} 
                    fill="url(#colorCosts)" 
                    name="Costs"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Breakdown Pie Chart */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Profit Sources
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.profitBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.profitBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: number) => formatCurrency(value, 'ZAR')}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Profit Margin by Shipment */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Profit Margin by Shipment
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.marginByShipment} barCategoryGap="60%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Margin']}
                />
                <Bar 
                  dataKey="margin" 
                  fill="hsl(239, 84%, 67%)" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Breakdown Cards */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Profit Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Gross Profit</p>
              <p className="text-2xl font-bold text-green-500">
                {formatCurrency(data.totalGrossProfit, 'ZAR')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Revenue - Costs</p>
            </div>
            
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">FX Commission (1.4%)</p>
              <p className="text-2xl font-bold text-cyan-500">
                {formatCurrency(data.totalFxCommission, 'ZAR')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Commission on FX conversions</p>
            </div>
            
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">FX Spread Profit</p>
              <p className="text-2xl font-bold text-purple-500">
                {formatCurrency(data.totalSpreadProfit, 'ZAR')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Spot rate vs applied rate</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Bank Charges (Deduction)</p>
                <p className="text-xl font-bold text-destructive mt-1">
                  -{formatCurrency(data.totalBankCharges, 'ZAR')}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive/50" />
            </div>
          </div>
        </div>

        {/* Liabilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-yellow-500" />
              Pending Payments
            </h3>
            <p className="text-3xl font-bold text-yellow-500">
              {formatCurrency(data.totalPendingPayments, 'ZAR')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Scheduled supplier payments awaiting completion
            </p>
          </div>
          
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              Owed to Suppliers
            </h3>
            <p className="text-3xl font-bold text-red-500">
              {formatCurrency(data.totalOwedToSuppliers, 'USD')}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Total outstanding supplier balances
            </p>
          </div>
        </div>

        {/* Shipment Profitability Table */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Shipment Profitability
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">LOT</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Supplier</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Costs</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Net Profit</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Margin</th>
                </tr>
              </thead>
              <tbody>
                {data.shipments.slice(0, 10).map((shipment) => (
                  <tr key={shipment.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">LOT {shipment.lot_number}</td>
                    <td className="py-3 px-4 text-muted-foreground">{shipment.supplier_name || '-'}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(shipment.client_invoice_zar || 0, 'ZAR')}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(shipment.total_zar || 0, 'ZAR')}</td>
                    <td className={cn(
                      'py-3 px-4 text-right font-medium',
                      (shipment.net_profit_zar || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                    )}>
                      {formatCurrency(shipment.net_profit_zar || 0, 'ZAR')}
                    </td>
                    <td className={cn(
                      'py-3 px-4 text-right',
                      (shipment.profit_margin || 0) >= 5 ? 'text-green-500' : 'text-yellow-500'
                    )}>
                      {(shipment.profit_margin || 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: typeof DollarSign;
  trend?: 'up' | 'down';
  description?: string;
  highlight?: boolean;
}

function MetricCard({ title, value, icon: Icon, trend, description, highlight }: MetricCardProps) {
  return (
    <div className={cn(
      'glass-card p-6 relative overflow-hidden',
      highlight && 'border-primary/30'
    )}>
      {highlight && (
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(187 94% 43%))',
          }}
        />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <Icon className={cn('h-5 w-5', highlight ? 'text-primary' : 'text-muted-foreground')} />
          {trend && (
            trend === 'up' 
              ? <ArrowUpRight className="h-4 w-4 text-green-500" />
              : <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
        </div>
        
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </div>
    </div>
  );
}
