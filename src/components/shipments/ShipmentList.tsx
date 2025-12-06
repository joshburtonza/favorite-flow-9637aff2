import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShipments } from '@/hooks/useShipments';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useClients } from '@/hooks/useClients';
import { ShipmentStatus } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Eye, Upload } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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

  const { data: shipments, isLoading } = useShipments({
    status: statusFilter,
    supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
    clientId: clientFilter !== 'all' ? clientFilter : undefined,
    search: search || undefined,
  });

  const { data: suppliers } = useSuppliers();
  const { data: clients } = useClients();

  const handleViewShipment = (id: string) => {
    navigate(`/shipments/${id}`);
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search LOT number..."
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

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => navigate('/import')}>
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
        <Button onClick={onNewShipment}>
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </div>

      {/* Shipments list */}
      {shipments?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No shipments found. Create your first shipment to get started.
            </p>
            <Button className="mt-4" onClick={onNewShipment}>
              <Plus className="h-4 w-4 mr-2" />
              Create Shipment
            </Button>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {shipments?.map((shipment) => (
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
              {shipments?.map((shipment) => (
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