import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSuppliers } from '@/hooks/useSuppliers';
import { formatCurrency } from '@/lib/formatters';
import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, Eye, CreditCard, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { SupplierLedgerModal } from '@/components/suppliers/SupplierLedgerModal';
import { Input } from '@/components/ui/input';

type FilterType = 'all' | 'outstanding' | 'overpaid';

export default function Creditors() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: suppliers, isLoading } = useSuppliers();
  const [filter, setFilter] = useState<FilterType>('all');
  const [ledgerSupplierId, setLedgerSupplierId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = suppliers?.filter((s) => {
    const matchesFilter = filter === 'all' || 
      (filter === 'outstanding' && s.current_balance > 0) ||
      (filter === 'overpaid' && s.current_balance < 0);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalOwed = suppliers?.reduce((sum, s) => s.current_balance > 0 ? sum + s.current_balance : sum, 0) || 0;
  const totalCredit = suppliers?.reduce((sum, s) => s.current_balance < 0 ? sum + Math.abs(s.current_balance) : sum, 0) || 0;

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'text-destructive';
    if (balance < 0) return 'text-success';
    return 'text-muted-foreground';
  };

  const getBalanceLabel = (balance: number) => {
    if (balance > 0) return 'Owed to supplier';
    if (balance < 0) return 'Credit balance';
    return 'Balanced';
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32 rounded-3xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
            <Skeleton className="h-32 rounded-3xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-in">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Finance</p>
            <h1 className="text-3xl font-semibold gradient-text">Creditors</h1>
          </div>
          <div className="search-glass w-full md:w-80">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search suppliers..." 
              className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Summary KPIs */}
        <div className="grid gap-6 md:grid-cols-2">
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
        <div className="glass-card p-4 flex items-center gap-4">
          <Label className="text-sm font-medium text-muted-foreground">Filter:</Label>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-48 rounded-xl bg-glass-surface border-glass-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-glass-border">
              <SelectItem value="all">Show All</SelectItem>
              <SelectItem value="outstanding">Outstanding Only</SelectItem>
              <SelectItem value="overpaid">Overpaid Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Creditors List */}
        {filteredSuppliers?.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-16">
            <TrendingDown className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">No creditors matching the current filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSuppliers?.map((supplier) => (
              <div key={supplier.id} className="glass-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{supplier.name}</h3>
                    <p className="text-sm text-muted-foreground">{supplier.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-2xl font-bold', getBalanceClass(supplier.current_balance))}>
                      {formatCurrency(Math.abs(supplier.current_balance), supplier.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">{getBalanceLabel(supplier.current_balance)}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-glass-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 rounded-xl hover:bg-glass-highlight"
                    onClick={() => setLedgerSupplierId(supplier.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Ledger
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 rounded-xl hover:bg-glass-highlight"
                    onClick={() => navigate('/payments')}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Make Payment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ledgerSupplierId && (
        <SupplierLedgerModal
          supplierId={ledgerSupplierId}
          open={!!ledgerSupplierId}
          onOpenChange={(open) => !open && setLedgerSupplierId(null)}
        />
      )}
    </AppLayout>
  );
}
