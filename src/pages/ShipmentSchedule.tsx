import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths, 
  isWithinInterval, 
  parseISO,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Ship, FileCheck, Clock, Package, Calendar, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useShipments } from '@/hooks/useShipments';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ShipmentStatus } from '@/types/database';
import { cn } from '@/lib/utils';

const statusConfig: Record<ShipmentStatus, { label: string; color: string; bgColor: string; icon: typeof Ship }> = {
  'pending': { label: 'Pending', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: Clock },
  'in-transit': { label: 'In Transit', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: Ship },
  'documents-submitted': { label: 'In Clearance', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: FileCheck },
  'completed': { label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: Package },
};

export default function ShipmentSchedule() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const { data: shipments, isLoading } = useShipments();

  // Real-time subscription for auto-updates
  useEffect(() => {
    const channel = supabase
      .channel('shipment-schedule-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['shipments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get calendar days including padding from prev/next months
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  // Filter shipments for current month based on ETA
  const currentMonthShipments = useMemo(() => {
    if (!shipments) return [];
    return shipments.filter(s => {
      if (!s.eta) return false;
      const etaDate = parseISO(s.eta);
      return isWithinInterval(etaDate, { start: monthStart, end: monthEnd });
    });
  }, [shipments, monthStart, monthEnd]);

  // Get shipments for a specific day
  const getShipmentsForDay = (day: Date) => {
    if (!shipments) return [];
    return shipments.filter(s => {
      if (!s.eta) return false;
      return isSameDay(parseISO(s.eta), day);
    });
  };

  // Group by status
  const inClearance = useMemo(() => 
    shipments?.filter(s => s.status === 'documents-submitted') || [], 
    [shipments]
  );

  const incoming = useMemo(() => 
    shipments?.filter(s => s.status === 'in-transit' || s.status === 'pending') || [], 
    [shipments]
  );

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const ShipmentCard = ({ shipment }: { shipment: typeof shipments[0] }) => {
    const config = statusConfig[shipment.status];
    const Icon = config.icon;
    
    return (
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors border-border/50"
        onClick={() => navigate(`/shipments/${shipment.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-foreground truncate">{shipment.lot_number}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {shipment.supplier?.name || 'No supplier'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                → {shipment.client?.name || 'No client'}
              </p>
              {shipment.eta && (
                <p className="text-xs text-muted-foreground mt-1">
                  ETA: {format(parseISO(shipment.eta), 'MMM dd, yyyy')}
                </p>
              )}
            </div>
            <Badge variant="outline" className={cn(config.bgColor, config.color, 'border-transparent')}>
              {config.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ShipmentList = ({ title, shipments, icon: Icon, emptyMessage }: { 
    title: string; 
    shipments: typeof currentMonthShipments; 
    icon: typeof Ship;
    emptyMessage: string;
  }) => (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
          <Badge variant="secondary" className="ml-auto">{shipments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
        {shipments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
        ) : (
          shipments.map(shipment => (
            <ShipmentCard key={shipment.id} shipment={shipment} />
          ))
        )}
      </CardContent>
    </Card>
  );

  const CalendarView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayShipments = getShipmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              
              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[100px] p-1 rounded-lg border transition-colors",
                    isCurrentMonth 
                      ? "bg-card border-border/50" 
                      : "bg-muted/30 border-transparent",
                    isCurrentDay && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1 px-1",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/50",
                    isCurrentDay && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 max-h-[80px] overflow-y-auto">
                    {dayShipments.slice(0, 3).map(shipment => {
                      const config = statusConfig[shipment.status];
                      return (
                        <div
                          key={shipment.id}
                          onClick={() => navigate(`/shipments/${shipment.id}`)}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded cursor-pointer truncate transition-opacity hover:opacity-80",
                            config.bgColor,
                            config.color
                          )}
                          title={`${shipment.lot_number} - ${shipment.supplier?.name || 'No supplier'}`}
                        >
                          {shipment.lot_number}
                        </div>
                      );
                    })}
                    {dayShipments.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayShipments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Shipment Schedule</h1>
          <p className="text-sm text-muted-foreground">Track shipments by month and status</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
            <TabsList>
              <TabsTrigger value="calendar" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="min-w-[140px]" onClick={() => setCurrentDate(new Date())}>
              <Calendar className="h-4 w-4 mr-2" />
              {format(currentDate, 'MMM yyyy')}
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{currentMonthShipments.length}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <FileCheck className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{inClearance.length}</p>
                <p className="text-xs text-muted-foreground">In Clearance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Ship className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{incoming.length}</p>
                <p className="text-xs text-muted-foreground">Incoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Package className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {shipments?.filter(s => s.status === 'completed').length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Content */}
      {viewMode === 'calendar' ? (
        <CalendarView />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ShipmentList 
            title={`${format(currentDate, 'MMMM')} Shipments`}
            shipments={currentMonthShipments}
            icon={Calendar}
            emptyMessage="No shipments scheduled for this month"
          />
          <ShipmentList 
            title="In Clearance"
            shipments={inClearance}
            icon={FileCheck}
            emptyMessage="No shipments in clearance"
          />
          <ShipmentList 
            title="Incoming"
            shipments={incoming}
            icon={Ship}
            emptyMessage="No incoming shipments"
          />
        </div>
      )}
    </div>
  );
}
