import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/ui/kpi-card';
import { ShipmentList } from '@/components/shipments/ShipmentList';
import { NewShipmentDialog } from '@/components/shipments/NewShipmentDialog';
import { AutomationStatus } from '@/components/automation/AutomationStatus';
import { TelegramCommands } from '@/components/automation/TelegramCommands';
import { ShipmentTimeline } from '@/components/tracking/ShipmentTimeline';
import { LiveStatusCards } from '@/components/tracking/LiveStatusCards';
import { ActivityFeed } from '@/components/tracking/ActivityFeed';
import { AIEventsWidget } from '@/components/ai/AIEventsWidget';
import { AIAlertsWidget } from '@/components/ai/AIAlertsWidget';
import { MyTasksWidget } from '@/components/tasks/MyTasksWidget';
import { RecentInvoicesWidget } from '@/components/dashboard/RecentInvoicesWidget';
import { PendingCostingsWidget } from '@/components/dashboard/PendingCostingsWidget';
import { QuickStatsWidget } from '@/components/dashboard/QuickStatsWidget';
import { AnnouncementsWidget } from '@/components/dashboard/AnnouncementsWidget';
import { MessagesWidget } from '@/components/dashboard/MessagesWidget';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardRealtime } from '@/hooks/useRealtimeSubscription';
import { formatCurrency } from '@/lib/formatters';
import { Package, DollarSign, FileText, Truck, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function Dashboard() {
  const [newShipmentOpen, setNewShipmentOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'shipments' | 'automation' | 'commands'>('shipments');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  useDashboardRealtime();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    toast.success('Dashboard refreshed');
  }, [queryClient]);

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="space-y-6 md:space-y-8">
          {/* Header Section */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Control Tower</p>
              <h1 className="text-2xl md:text-3xl font-semibold gradient-text">Dashboard</h1>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 md:h-32 rounded-2xl md:rounded-3xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <KPICard
                title="Active Shipments"
                value={stats?.activeShipments || 0}
                icon={Package}
                description={isMobile ? undefined : "Currently in progress"}
              />
              <KPICard
                title="Value in Transit"
                value={formatCurrency(stats?.totalValueInTransit || 0, 'ZAR', { compact: true })}
                icon={DollarSign}
                description={isMobile ? undefined : "Total client invoices"}
              />
              <KPICard
                title="Docs Pending"
                value={stats?.documentsPending || 0}
                icon={FileText}
                description={isMobile ? undefined : "Awaiting submission"}
              />
              <KPICard
                title="Deliveries"
                value={stats?.deliveriesThisWeek || 0}
                icon={Truck}
                description={isMobile ? undefined : "This week"}
              />
            </div>
          )}

          {/* Dashboard Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <ShipmentTimeline />
              <AIAlertsWidget />
              <MyTasksWidget />
            </div>
            
            {/* Right Column - Widgets */}
            <div className="space-y-4 md:space-y-6">
              <AnnouncementsWidget />
              <MessagesWidget />
              <CalendarWidget />
              <QuickStatsWidget />
              <RecentInvoicesWidget />
              <PendingCostingsWidget />
              <AIEventsWidget />
              <ActivityFeed />
            </div>
          </div>
          
          <LiveStatusCards />

          {/* Tab Switcher */}
          <div className="glass-card p-2">
            <div className="flex gap-1 md:gap-2">
              {[
                { id: 'shipments', label: 'Shipments' },
                { id: 'automation', label: 'Automation' },
                { id: 'commands', label: 'Commands' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2.5 md:py-3 px-3 md:px-4 rounded-xl text-xs md:text-sm font-medium transition-all touch-manipulation ${
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
              <ShipmentList onNewShipment={() => setNewShipmentOpen(true)} externalSearch={searchQuery} />
            )}
            {activeTab === 'automation' && <AutomationStatus />}
            {activeTab === 'commands' && <TelegramCommands />}
          </div>
        </div>
      </PullToRefresh>

      <NewShipmentDialog open={newShipmentOpen} onOpenChange={setNewShipmentOpen} />
    </AppLayout>
  );
}
