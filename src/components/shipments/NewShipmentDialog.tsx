import { useState } from 'react';
import { useCreateShipment } from '@/hooks/useShipments';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface NewShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewShipmentDialog({ open, onOpenChange }: NewShipmentDialogProps) {
  const navigate = useNavigate();
  const createShipment = useCreateShipment();
  const { data: suppliers } = useSuppliers();
  const { data: clients } = useClients();

  const [lotNumber, setLotNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [clientId, setClientId] = useState('');
  const [commodity, setCommodity] = useState('');
  const [eta, setEta] = useState<Date | undefined>();
  const [error, setError] = useState('');

  const resetForm = () => {
    setLotNumber('');
    setSupplierId('');
    setClientId('');
    setCommodity('');
    setEta(undefined);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!lotNumber.trim()) {
      setError('LOT number is required');
      return;
    }

    try {
      const shipment = await createShipment.mutateAsync({
        lot_number: lotNumber.trim(),
        supplier_id: supplierId || undefined,
        client_id: clientId || undefined,
        commodity: commodity || undefined,
        eta: eta ? format(eta, 'yyyy-MM-dd') : undefined,
      });

      resetForm();
      onOpenChange(false);
      navigate(`/shipments/${shipment.id}`);
    } catch (err: any) {
      if (err.message?.includes('duplicate key')) {
        setError('A shipment with this LOT number already exists');
      } else {
        setError(err.message || 'Failed to create shipment');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Shipment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lot-number">LOT Number *</Label>
            <Input
              id="lot-number"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="e.g., LOT-2024-001"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Commodity</Label>
            <Input
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              placeholder="Enter commodity"
            />
          </div>

          <div className="space-y-2">
            <Label>ETA</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !eta && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {eta ? format(eta, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={eta}
                  onSelect={setEta}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createShipment.isPending}>
              {createShipment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Shipment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}