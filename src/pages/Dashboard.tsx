import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/ui/kpi-card';
import { ShipmentList } from '@/components/shipments/ShipmentList';
import { NewShipmentDialog } from '@/components/shipments/NewShipmentDialog';
import { AutomationStatus } from '@/components/automation/AutomationStatus';
import { WhatsAppCommands } from '@/components/automation/WhatsAppCommands';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { formatCurrency } from '@/lib/formatters';
import { Package, DollarSign, FileText, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

        {/* Tabs for Shipments, Automation Status, WhatsApp Commands */}
        <Tabs defaultValue="shipments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
            <TabsTrigger value="automation">Automation Status</TabsTrigger>
            <TabsTrigger value="commands">WhatsApp Commands</TabsTrigger>
          </TabsList>

          <TabsContent value="shipments" className="space-y-4">
            <ShipmentList onNewShipment={() => setNewShipmentOpen(true)} />
          </TabsContent>

          <TabsContent value="automation" className="space-y-4">
            <AutomationStatus />
          </TabsContent>

          <TabsContent value="commands" className="space-y-4">
            <WhatsAppCommands />
          </TabsContent>
        </Tabs>
      </div>

      <NewShipmentDialog open={newShipmentOpen} onOpenChange={setNewShipmentOpen} />
    </AppLayout>
  );
}
