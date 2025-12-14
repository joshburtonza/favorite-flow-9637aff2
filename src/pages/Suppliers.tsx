import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/useSuppliers';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Loader2, Eye, Pencil, Trash2, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CurrencyType, Supplier } from '@/types/database';
import { useIsMobile } from '@/hooks/use-mobile';
import { SupplierLedgerModal } from '@/components/suppliers/SupplierLedgerModal';

export default function Suppliers() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: suppliers, isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [ledgerSupplierId, setLedgerSupplierId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const filteredSuppliers = suppliers?.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setName('');
    setCurrency('USD');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setEditingSupplier(null);
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setCurrency(supplier.currency);
    setContactPerson(supplier.contact_person || '');
    setEmail(supplier.email || '');
    setPhone(supplier.phone || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingSupplier) {
      await updateSupplier.mutateAsync({
        id: editingSupplier.id,
        name: name.trim(),
        currency,
        contact_person: contactPerson || null,
        email: email || null,
        phone: phone || null,
      });
    } else {
      await createSupplier.mutateAsync({
        name: name.trim(),
        currency,
        contact_person: contactPerson || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const supplierToDelete = suppliers?.find(s => s.id === deleteConfirmId);
    await deleteSupplier.mutateAsync({ id: deleteConfirmId, name: supplierToDelete?.name });
    setDeleteConfirmId(null);
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0) return 'text-destructive';
    if (balance < 0) return 'text-success';
    return 'text-muted-foreground';
  };

  const isSubmitting = createSupplier.isPending || updateSupplier.isPending;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
            ))}
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
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Management</p>
            <h1 className="text-3xl font-semibold gradient-text">Suppliers</h1>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="search-glass flex-1 md:w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search suppliers..." 
                className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="rounded-xl"
              style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))' }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </header>

        {/* Suppliers Grid */}
        {filteredSuppliers?.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery ? 'No suppliers match your search' : 'No suppliers found. Add your first supplier.'}
            </p>
            {!searchQuery && (
              <Button 
                className="mt-4 rounded-xl"
                onClick={() => setDialogOpen(true)}
                style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers?.map((supplier) => (
              <div 
                key={supplier.id} 
                className="glass-card group cursor-pointer"
                onClick={() => navigate(`/suppliers/${supplier.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{supplier.name}</h3>
                    <p className="text-sm text-muted-foreground">{supplier.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-xl font-bold', getBalanceClass(supplier.current_balance))}>
                      {formatCurrency(Math.abs(supplier.current_balance), supplier.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {supplier.current_balance > 0 ? 'owed' : supplier.current_balance < 0 ? 'credit' : 'balanced'}
                    </p>
                  </div>
                </div>
                
                {supplier.contact_person && (
                  <p className="text-sm text-muted-foreground mb-4">{supplier.contact_person}</p>
                )}

                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 rounded-xl hover:bg-muted"
                    onClick={(e) => { e.stopPropagation(); setLedgerSupplierId(supplier.id); }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ledger
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl hover:bg-muted"
                    onClick={(e) => { e.stopPropagation(); openEditDialog(supplier); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl hover:bg-destructive/20 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(supplier.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md glass-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="gradient-text">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Name *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Supplier name"
                className="rounded-xl bg-glass-surface border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyType)}>
                <SelectTrigger className="rounded-xl bg-glass-surface border-glass-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-glass-border">
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="ZAR">ZAR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Contact Person</Label>
              <Input 
                value={contactPerson} 
                onChange={(e) => setContactPerson(e.target.value)} 
                placeholder="Contact name"
                className="rounded-xl bg-glass-surface border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Email</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="email@example.com"
                className="rounded-xl bg-glass-surface border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Phone</Label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+1 234 567 890"
                className="rounded-xl bg-glass-surface border-glass-border"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="rounded-xl"
                style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))' }}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingSupplier ? 'Save' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent className="glass-card border-glass-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will delete all related ledger entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              {deleteSupplier.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ledger Modal */}
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
