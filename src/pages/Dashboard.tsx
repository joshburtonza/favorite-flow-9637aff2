import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/ui/kpi-card';
import { ShipmentList } from '@/components/shipments/ShipmentList';
import { NewShipmentDialog } from '@/components/shipments/NewShipmentDialog';
import { AutomationStatus } from '@/components/automation/AutomationStatus';
import { WhatsAppCommands } from '@/components/automation/WhatsAppCommands';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardRealtime } from '@/hooks/useRealtimeSubscription';
import { formatCurrency } from '@/lib/formatters';
import { Package, DollarSign, FileText, Truck, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Dashboard() {
  const [newShipmentOpen, setNewShipmentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'shipments' | 'automation' | 'commands'>('shipments');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const isMobile = useIsMobile();
  
  useDashboardRealtime();

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Control Tower</p>
            <h1 className="text-3xl font-semibold gradient-text">Dashboard</h1>
          </div>
          <div className="search-glass w-full md:w-80">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search shipments..." 
              className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* KPI Cards Bento Grid */}
        {statsLoading ? (
          <div className="bento-grid">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
            ))}
          </div>
        ) : (
          <div className="bento-grid">
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
          </div>
        )}

        {/* Tab Switcher */}
        <div className="glass-card p-2">
          <div className="flex gap-2">
            {[
              { id: 'shipments', label: 'Shipments' },
              { id: 'automation', label: 'Automation' },
              { id: 'commands', label: 'Commands' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-foreground border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={{
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, hsl(239 84% 67% / 0.2), hsl(187 94% 43% / 0.2))'
                    : 'transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'shipments' && (
            <ShipmentList onNewShipment={() => setNewShipmentOpen(true)} />
          )}
          {activeTab === 'automation' && <AutomationStatus />}
          {activeTab === 'commands' && <WhatsAppCommands />}
        </div>
      </div>

      <NewShipmentDialog open={newShipmentOpen} onOpenChange={setNewShipmentOpen} />
    </AppLayout>
  );
}
