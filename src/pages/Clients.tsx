import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { AppLayout } from '@/components/layout/AppLayout';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Loader2, Pencil, Trash2, Building2, Search, Mail, Phone } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Client } from '@/types/database';

function ClientsContent() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const filteredClients = clients?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setEditingClient(null);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setContactPerson(client.contact_person || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingClient) {
      await updateClient.mutateAsync({
        id: editingClient.id,
        name: name.trim(),
        contact_person: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
      });
    } else {
      await createClient.mutateAsync({
        name: name.trim(),
        contact_person: contactPerson || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
      });
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const clientToDelete = clients?.find(c => c.id === deleteConfirmId);
    await deleteClient.mutateAsync({ id: deleteConfirmId, name: clientToDelete?.name });
    setDeleteConfirmId(null);
  };

  const isSubmitting = createClient.isPending || updateClient.isPending;

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
            <h1 className="text-3xl font-semibold gradient-text">Clients</h1>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="search-glass flex-1 md:w-64">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search clients..." 
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

        {/* Clients Grid */}
        {filteredClients?.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery ? 'No clients match your search' : 'No clients found. Add your first client.'}
            </p>
            {!searchQuery && (
              <Button 
                className="mt-4 rounded-xl"
                onClick={() => setDialogOpen(true)}
                style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))' }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients?.map((client) => (
              <div 
                key={client.id} 
                className="glass-card group cursor-pointer"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{client.name}</h3>
                  {client.contact_person && (
                    <p className="text-sm text-muted-foreground">{client.contact_person}</p>
                  )}
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 rounded-xl hover:bg-muted"
                    onClick={(e) => { e.stopPropagation(); openEditDialog(client); }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl hover:bg-destructive/20 hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(client.id); }}
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
            <DialogTitle className="gradient-text">{editingClient ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Name *</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Client name"
                className="rounded-xl bg-glass-surface border-glass-border"
              />
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
                placeholder="+27 12 345 6789"
                className="rounded-xl bg-glass-surface border-glass-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Address</Label>
              <Input 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="Street address, city"
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
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingClient ? 'Save' : 'Add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent className="glass-card border-glass-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              {deleteClient.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

export default function Clients() {
  return (
    <PermissionGate permission="view_clients" pageLevel>
      <ClientsContent />
    </PermissionGate>
  );
}
