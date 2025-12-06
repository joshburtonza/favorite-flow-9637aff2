import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/ui/kpi-card';
import { ShipmentList } from '@/components/shipments/ShipmentList';
import { NewShipmentDialog } from '@/components/shipments/NewShipmentDialog';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { formatCurrency } from '@/lib/formatters';
import { Package, DollarSign, FileText, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const [newShipmentOpen, setNewShipmentOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your shipment operations</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </>
          ) : (
            <>
              <KPICard
                title="Active Shipments"
                value={stats?.activeShipments || 0}
                icon={Package}
                description="Currently in progress"
              />
              <KPICard
                title="Value in Transit"
                value={formatCurrency(stats?.totalValueInTransit || 0, 'ZAR', { compact: true })}
                icon={DollarSign}
                description="Total client invoices"
              />
              <KPICard
                title="Documents Pending"
                value={stats?.documentsPending || 0}
                icon={FileText}
                description="Awaiting submission"
              />
              <KPICard
                title="Deliveries This Week"
                value={stats?.deliveriesThisWeek || 0}
                icon={Truck}
                description="Scheduled for delivery"
              />
            </>
          )}
        </div>

        {/* Shipments List */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">All Shipments</h2>
          <ShipmentList onNewShipment={() => setNewShipmentOpen(true)} />
        </div>
      </div>

      <NewShipmentDialog open={newShipmentOpen} onOpenChange={setNewShipmentOpen} />
    </AppLayout>
  );
}