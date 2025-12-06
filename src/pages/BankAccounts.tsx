import { AppLayout } from '@/components/layout/AppLayout';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Landmark } from 'lucide-react';

export default function BankAccounts() {
  const { data: accounts, isLoading } = useBankAccounts();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
          <p className="text-muted-foreground">Manage your bank accounts and view balances</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts?.map((account) => (
            <Card key={account.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Landmark className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{account.currency}</span>
                </div>
                <CardTitle className="text-lg mt-2">{account.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold currency-display">
                      {formatCurrency(account.current_balance, account.currency)}
                    </p>
                  </div>
                  {account.account_number && (
                    <p className="text-sm text-muted-foreground">
                      Account: {account.account_number}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated: {formatDate(account.updated_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {accounts?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">No bank accounts configured.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}