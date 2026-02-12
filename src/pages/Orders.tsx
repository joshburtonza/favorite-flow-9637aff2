import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleBasedData } from '@/hooks/useRoleBasedData';
import { AppLayout } from '@/components/layout/AppLayout';
import { useShipments } from '@/hooks/useShipments';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { 
  Package, 
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Truck,
  FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDashboardRealtime } from '@/hooks/useRealtimeSubscription';

export default function Orders() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { permissions } = useRoleBasedData();
  
  useDashboardRealtime();
  
  const { data: shipments, isLoading } = useShipments({
    status: statusFilter !== 'all' ? statusFilter as any : undefined,
    search: searchQuery || undefined,
  });

  // Calculate summary stats
  const stats = {
    total: shipments?.length || 0,
    pending: shipments?.filter(s => s.status === 'pending').length || 0,
    inTransit: shipments?.filter(s => s.status === 'in-transit').length || 0,
    completed: shipments?.filter(s => s.status === 'completed').length || 0,
    totalValue: shipments?.reduce((sum, s) => {
      const costs = (s as any).shipment_costs?.[0];
      return sum + (costs?.client_invoice_zar || 0);
    }, 0) || 0,
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-48 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Order Management</p>
            <h1 className="text-3xl font-semibold gradient-text">Orders</h1>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="search-glass flex-1 md:w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search orders..." 
                className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] rounded-xl bg-card border-border">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-transit">In Transit</SelectItem>
                <SelectItem value="documents-submitted">Docs Submitted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Orders</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-yellow-500" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">In Transit</span>
            </div>
            <p className="text-2xl font-bold text-yellow-500">{stats.inTransit}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-blue-500">{stats.pending}</p>
          </div>
          {permissions.canSeeFinancials && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Total Value</span>
              </div>
              <p className="text-2xl font-bold text-green-500">
                {formatCurrency(stats.totalValue, 'ZAR', { compact: true })}
              </p>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            All Orders
          </h3>
          
          {!shipments || shipments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>No orders found</p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  className="mt-4 rounded-xl"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">LOT</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Commodity</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Supplier</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Client</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                     <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">ETA</th>
                     {permissions.canSeeFinancials && <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Invoice</th>}
                     {permissions.canSeeFinancials && <th className="text-right py-3 px-4 text-xs uppercase tracking-wide text-muted-foreground">Profit</th>}
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((shipment) => {
                    const costs = (shipment as any).shipment_costs?.[0];
                    const supplier = (shipment as any).suppliers;
                    const client = (shipment as any).clients;
                    
                    return (
                      <tr 
                        key={shipment.id} 
                        className="border-b border-border/20 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => navigate(`/shipments/${shipment.id}`)}
                      >
                        <td className="py-3 px-4 font-medium">LOT {shipment.lot_number}</td>
                        <td className="py-3 px-4 text-muted-foreground">{shipment.commodity || '-'}</td>
                        <td className="py-3 px-4 text-muted-foreground">{supplier?.name || '-'}</td>
                        <td className="py-3 px-4 text-muted-foreground">{client?.name || '-'}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={shipment.status} />
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {shipment.eta ? format(new Date(shipment.eta), 'MMM d') : '-'}
                        </td>
                        {permissions.canSeeFinancials && (
                          <td className="py-3 px-4 text-right">
                            {costs?.client_invoice_zar 
                              ? formatCurrency(costs.client_invoice_zar, 'ZAR') 
                              : '-'}
                          </td>
                        )}
                        {permissions.canSeeFinancials && (
                          <td className={cn(
                            'py-3 px-4 text-right font-medium',
                            (costs?.net_profit_zar || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                          )}>
                            {costs?.net_profit_zar 
                              ? formatCurrency(costs.net_profit_zar, 'ZAR') 
                              : '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
