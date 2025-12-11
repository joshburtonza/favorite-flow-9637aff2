import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShipments } from '@/hooks/useShipments';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useClients } from '@/hooks/useClients';
import { ShipmentStatus } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { exportProfitReportPDF } from '@/lib/pdf-export';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Eye, Upload, CalendarIcon, X, Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';

interface ShipmentListProps {
  onNewShipment: () => void;
}

export function ShipmentList({ onNewShipment }: ShipmentListProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: shipments, isLoading } = useShipments({
    status: statusFilter,
    supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
    clientId: clientFilter !== 'all' ? clientFilter : undefined,
    startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  });

  const { data: suppliers } = useSuppliers();
  const { data: clients } = useClients();

  // Filter shipments by search (LOT number, supplier name, client name)
  const filteredShipments = useMemo(() => {
    if (!shipments) return [];
    if (!search.trim()) return shipments;
    
    const searchLower = search.toLowerCase().trim();
    return shipments.filter((s) => 
      s.lot_number.toLowerCase().includes(searchLower) ||
      s.supplier?.name?.toLowerCase().includes(searchLower) ||
      s.client?.name?.toLowerCase().includes(searchLower) ||
      s.commodity?.toLowerCase().includes(searchLower)
    );
  }, [shipments, search]);

  const handleViewShipment = (id: string) => {
    navigate(`/shipments/${id}`);
  };

  const clearDateRange = () => {
    setDateRange(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = [
    statusFilter !== 'all',
    supplierFilter !== 'all',
    clientFilter !== 'all',
    dateRange?.from
  ].filter(Boolean).length;

  const handleExportReport = () => {
    if (filteredShipments && filteredShipments.length > 0) {
      exportProfitReportPDF(
        filteredShipments.map(s => ({
          lot_number: s.lot_number,
          supplier_name: s.supplier?.name || null,
          client_name: s.client?.name || null,
          commodity: s.commodity || null,
          eta: s.eta || null,
          status: s.status,
          document_submitted: s.document_submitted,
          telex_released: s.telex_released,
          delivery_date: s.delivery_date || null,
          costs: s.costs ? {
            source_currency: s.costs.source_currency,
            supplier_cost: s.costs.supplier_cost,
            freight_cost: s.costs.freight_cost,
            clearing_cost: s.costs.clearing_cost,
            transport_cost: s.costs.transport_cost,
            total_foreign: s.costs.total_foreign,
            fx_spot_rate: s.costs.fx_spot_rate,
            fx_applied_rate: s.costs.fx_applied_rate,
            fx_spread: s.costs.fx_spread,
            total_zar: s.costs.total_zar,
            client_invoice_zar: s.costs.client_invoice_zar,
            gross_profit_zar: s.costs.gross_profit_zar,
            fx_commission_zar: s.costs.fx_commission_zar,
            fx_spread_profit_zar: s.costs.fx_spread_profit_zar,
            bank_charges: s.costs.bank_charges,
            net_profit_zar: s.costs.net_profit_zar,
            profit_margin: s.costs.profit_margin,
          } : null,
        })),
        dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined
      );
      toast.success('Profit report exported');
    } else {
      toast.error('No shipments to export');
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Mobile: Search + Filter Toggle + Add Button */}
      {isMobile ? (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search LOT, supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-11 w-11 shrink-0 relative"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Search className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            <Button onClick={onNewShipment} size="icon" className="h-11 w-11 shrink-0">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
              {/* Status Filter Chips */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'in-transit', label: 'In Transit' },
                    { value: 'documents-submitted', label: 'Docs' },
                    { value: 'completed', label: 'Done' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setStatusFilter(status.value as ShipmentStatus | 'all')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px]',
                        statusFilter === status.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border text-foreground hover:bg-accent'
                      )}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supplier & Client Selects */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal flex-1 h-11',
                        !dateRange && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        'ETA Date Range'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {dateRange && (
                  <Button variant="ghost" size="icon" onClick={clearDateRange} className="h-11 w-11">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 h-10"
                  onClick={handleExportReport}
                  disabled={!filteredShipments || filteredShipments.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 h-10"
                  onClick={() => navigate('/import')}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Import
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Desktop: Original Filter Layout */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search LOT, supplier, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ShipmentStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-transit">In Transit</SelectItem>
                <SelectItem value="documents-submitted">Docs Submitted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filters Row 2 - Date Range */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal w-full sm:w-auto',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      'ETA Date Range'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <Button variant="ghost" size="icon" onClick={clearDateRange} className="h-9 w-9">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 ml-auto">
              <Button 
                variant="outline" 
                onClick={handleExportReport}
                disabled={!filteredShipments || filteredShipments.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" onClick={() => navigate('/import')}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={onNewShipment}>
                <Plus className="h-4 w-4 mr-2" />
                New Shipment
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Shipments list */}
      {filteredShipments?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              {shipments?.length === 0 
                ? 'No shipments found. Create your first shipment to get started.'
                : 'No shipments match your search criteria.'}
            </p>
            {shipments?.length === 0 && (
              <Button className="mt-4" onClick={onNewShipment}>
                <Plus className="h-4 w-4 mr-2" />
                Create Shipment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredShipments?.map((shipment) => (
            <Card 
              key={shipment.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewShipment(shipment.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{shipment.lot_number}</p>
                    <p className="text-sm text-muted-foreground">{shipment.supplier?.name || '-'}</p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Client: {shipment.client?.name || '-'}</p>
                    <p className="text-muted-foreground">ETA: {formatDate(shipment.eta)}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-semibold currency-display',
                      (shipment.costs?.net_profit_zar || 0) >= 0 ? 'profit-positive' : 'profit-negative'
                    )}>
                      {formatCurrency(shipment.costs?.net_profit_zar || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LOT Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Net Profit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments?.map((shipment) => (
                <TableRow key={shipment.id} className="cursor-pointer" onClick={() => handleViewShipment(shipment.id)}>
                  <TableCell className="font-medium">{shipment.lot_number}</TableCell>
                  <TableCell>{shipment.supplier?.name || '-'}</TableCell>
                  <TableCell>{shipment.client?.name || '-'}</TableCell>
                  <TableCell>{formatDate(shipment.eta)}</TableCell>
                  <TableCell><StatusBadge status={shipment.status} /></TableCell>
                  <TableCell className={cn(
                    'text-right font-semibold currency-display',
                    (shipment.costs?.net_profit_zar || 0) >= 0 ? 'profit-positive' : 'profit-negative'
                  )}>
                    {formatCurrency(shipment.costs?.net_profit_zar || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewShipment(shipment.id);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}