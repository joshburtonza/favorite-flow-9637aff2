import { PermissionGate } from '@/components/auth/PermissionGate';
import { AppLayout } from '@/components/layout/AppLayout';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Landmark } from 'lucide-react';

function BankAccountsContent() {
  const { data: accounts, isLoading } = useBankAccounts();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-3xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="animate-slide-in">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Finance</p>
          <h1 className="text-3xl font-semibold gradient-text">Bank Accounts</h1>
        </header>
        {accounts?.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-16">
            <Landmark className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">No bank accounts configured.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts?.map((account) => (
              <div key={account.id} className="glass-card">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(239 84% 67% / 0.2), hsl(187 94% 43% / 0.2))' }}>
                    <Landmark className="h-6 w-6 text-primary" />
                  </div>
                  <span className="trend-badge trend-up">{account.currency}</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">{account.name}</h3>
                {account.bank_name && <p className="text-sm text-muted-foreground mb-4">{account.bank_name}</p>}
                <div className="pt-4 border-t border-glass-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Balance</p>
                  <p className="text-3xl font-bold gradient-text">{formatCurrency(account.current_balance, account.currency)}</p>
                </div>
                <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                  {account.account_number && <span>Acc: {account.account_number}</span>}
                  <span>Updated: {formatDate(account.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function BankAccounts() {
  return (
    <PermissionGate permission="manage_bank_accounts" pageLevel>
      <BankAccountsContent />
    </PermissionGate>
  );
}
