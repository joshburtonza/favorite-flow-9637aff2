import { AppLayout } from '@/components/layout/AppLayout';
import { useSuppliers } from '@/hooks/useSuppliers';
import { formatCurrency } from '@/lib/formatters';
import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, Eye, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

type FilterType = 'all' | 'outstanding' | 'overpaid';

export default function Creditors() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: suppliers, isLoading } = useSuppliers();
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter suppliers based on balance
  const filteredSuppliers = suppliers?.filter((s) => {
    if (filter === 'outstanding') return s.current_balance > 0;
    if (filter === 'overpaid') return s.current_balance < 0;
    return true;
  });

  // Calculate totals
  const totalOwed = suppliers?.reduce((sum, s) => s.current_balance > 0 ? sum + s.current_balance : sum, 0) || 0;
  const totalCredit = suppliers?.reduce((sum, s) => s.current_balance < 0 ? sum + Math.abs(s.current_balance) : sum, 0) || 0;

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'profit-negative';
    if (balance < 0) return 'profit-positive';
    return 'profit-neutral';
  };

  const getBalanceLabel = (balance: number) => {
    if (balance > 0) return 'Owed to supplier';
    if (balance < 0) return 'Credit balance';
    return 'Balanced';
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Creditors</h1>
          <p className="text-muted-foreground">Outstanding balances with suppliers</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <KPICard
            title="Total Owed TO Suppliers"
            value={formatCurrency(totalOwed, 'ZAR', { compact: true })}
            icon={TrendingDown}
            description="Outstanding payables"
          />
          <KPICard
            title="Total Owed BY Suppliers"
            value={formatCurrency(totalCredit, 'ZAR', { compact: true })}
            icon={TrendingUp}
            description="Credit balances"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">Filter:</Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Show All</SelectItem>
              <SelectItem value="outstanding">Outstanding Only</SelectItem>
              <SelectItem value="overpaid">Overpaid Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Creditors Table */}
        {filteredSuppliers?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">No creditors matching the current filter.</p>
            </CardContent>
          </Card>
        ) : isMobile ? (
          <div className="space-y-3">
            {filteredSuppliers?.map((supplier) => (
              <Card key={supplier.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{supplier.name}</p>
                      <p className="text-sm text-muted-foreground">{supplier.currency}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-semibold currency-display', getBalanceClass(supplier.current_balance))}>
                        {formatCurrency(Math.abs(supplier.current_balance), supplier.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">{getBalanceLabel(supplier.current_balance)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ledger
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('/payments')}>
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pay
                    </Button>
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
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers?.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.currency}</TableCell>
                    <TableCell className={cn('text-right font-semibold currency-display', getBalanceClass(supplier.current_balance))}>
                      {formatCurrency(Math.abs(supplier.current_balance), supplier.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getBalanceLabel(supplier.current_balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ledger
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/payments')}>
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pay
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}