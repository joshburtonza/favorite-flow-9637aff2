import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin,
  Package,
  DollarSign,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: shipments, isLoading: shipmentsLoading } = useQuery({
    queryKey: ['client-shipments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_shipments_full')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter in memory since v_shipments_full might not have client_id directly accessible
      return (data || []).filter(s => (s as any).client_id === id);
    },
    enabled: !!id,
  });

  const isLoading = clientLoading || shipmentsLoading;

  // Calculate financial summary
  const financialSummary = {
    totalRevenue: shipments?.reduce((sum, s) => sum + (s.client_invoice_zar || 0), 0) || 0,
    totalProfit: shipments?.reduce((sum, s) => sum + (s.net_profit_zar || 0), 0) || 0,
    shipmentCount: shipments?.length || 0,
    avgMargin: shipments?.length 
      ? (shipments.reduce((sum, s) => sum + (s.profit_margin || 0), 0) / shipments.length)
      : 0,
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Client not found</p>
          <Button onClick={() => navigate('/clients')} className="mt-4 rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <header className="animate-slide-in">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/clients')}
            className="mb-4 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Client Details</p>
              <h1 className="text-3xl font-semibold gradient-text">{client.name}</h1>
              {client.contact_person && (
                <p className="text-muted-foreground mt-1">{client.contact_person}</p>
              )}
            </div>
          </div>
        </header>

        {/* Contact Info */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {client.email && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{client.phone}</p>
                </div>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{client.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <Package className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Orders</span>
            </div>
            <p className="text-3xl font-bold">{financialSummary.shipmentCount}</p>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Revenue</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(financialSummary.totalRevenue, 'ZAR', { compact: true })}</p>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Profit</span>
            </div>
            <p className={cn(
              'text-3xl font-bold',
              financialSummary.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
            )}>
              {formatCurrency(financialSummary.totalProfit, 'ZAR', { compact: true })}
            </p>
          </div>
          <div className="glass-card">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Avg Margin</span>
            </div>
            <p className={cn(
              'text-3xl font-bold',
              financialSummary.avgMargin >= 5 ? 'text-green-500' : 'text-yellow-500'
            )}>
              {financialSummary.avgMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Orders/Shipments Table */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Orders History
          </h3>
          
          {!shipments || shipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found for this client
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">LOT</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Commodity</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Invoice</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Profit</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((shipment) => (
                    <tr 
                      key={shipment.id} 
                      className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/shipments/${shipment.id}`)}
                    >
                      <td className="py-3 px-4 font-medium">LOT {shipment.lot_number}</td>
                      <td className="py-3 px-4 text-muted-foreground">{shipment.commodity || '-'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={shipment.status || 'pending'} />
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {shipment.created_at ? format(new Date(shipment.created_at), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(shipment.client_invoice_zar || 0, 'ZAR')}
                      </td>
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
          )}
        </div>
      </div>
    </AppLayout>
  );
}
