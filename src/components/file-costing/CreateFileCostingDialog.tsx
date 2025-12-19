import { useState, useEffect } from 'react';
import { Calculator, Truck, FileCheck, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  useShipmentsReadyForCosting,
  useShipmentDocuments,
  useCreateFileCosting,
  useUpdateFileCosting,
  FileCosting,
  FileCostingStatus,
} from '@/hooks/useFileCostings';
import { formatCurrency } from '@/lib/formatters';

interface CreateFileCostingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCosting?: FileCosting | null;
}

export function CreateFileCostingDialog({
  open,
  onOpenChange,
  editingCosting,
}: CreateFileCostingDialogProps) {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
  const [selectedTransportDocs, setSelectedTransportDocs] = useState<string[]>([]);
  const [selectedClearingDocs, setSelectedClearingDocs] = useState<string[]>([]);
  const [selectedOtherDocs, setSelectedOtherDocs] = useState<string[]>([]);
  const [transportCost, setTransportCost] = useState<number>(0);
  const [clearingCost, setClearingCost] = useState<number>(0);
  const [otherCosts, setOtherCosts] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<FileCostingStatus>('draft');

  const { data: shipmentsReady } = useShipmentsReadyForCosting();
  const { data: documents } = useShipmentDocuments(selectedShipmentId || editingCosting?.shipment_id || undefined);
  const createCosting = useCreateFileCosting();
  const updateCosting = useUpdateFileCosting();

  const selectedShipment = shipmentsReady?.find(s => s.id === selectedShipmentId);
  const grandTotal = transportCost + clearingCost + otherCosts;

  // Reset form when dialog opens/closes or editing changes
  useEffect(() => {
    if (open && editingCosting) {
      setSelectedShipmentId(editingCosting.shipment_id || '');
      setSelectedTransportDocs(editingCosting.transport_documents);
      setSelectedClearingDocs(editingCosting.clearing_documents);
      setSelectedOtherDocs(editingCosting.other_documents);
      setTransportCost(editingCosting.transport_cost_zar);
      setClearingCost(editingCosting.clearing_cost_zar);
      setOtherCosts(editingCosting.other_costs_zar);
      setNotes(editingCosting.notes || '');
      setStatus(editingCosting.status);
    } else if (open) {
      setSelectedShipmentId('');
      setSelectedTransportDocs([]);
      setSelectedClearingDocs([]);
      setSelectedOtherDocs([]);
      setTransportCost(0);
      setClearingCost(0);
      setOtherCosts(0);
      setNotes('');
      setStatus('draft');
    }
  }, [open, editingCosting]);

  const handleDocToggle = (
    docId: string,
    selected: string[],
    setSelected: (docs: string[]) => void
  ) => {
    if (selected.includes(docId)) {
      setSelected(selected.filter(id => id !== docId));
    } else {
      setSelected([...selected, docId]);
    }
  };

  const handleSubmit = () => {
    const lotNumber = editingCosting?.lot_number || selectedShipment?.lot_number || '';

    if (editingCosting) {
      updateCosting.mutate({
        id: editingCosting.id,
        transport_documents: selectedTransportDocs,
        clearing_documents: selectedClearingDocs,
        other_documents: selectedOtherDocs,
        transport_cost_zar: transportCost,
        clearing_cost_zar: clearingCost,
        other_costs_zar: otherCosts,
        grand_total_zar: grandTotal,
        notes,
        status,
      }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createCosting.mutate({
        shipment_id: selectedShipmentId,
        lot_number: lotNumber,
        transport_documents: selectedTransportDocs,
        clearing_documents: selectedClearingDocs,
        other_documents: selectedOtherDocs,
        transport_cost_zar: transportCost,
        clearing_cost_zar: clearingCost,
        other_costs_zar: otherCosts,
        grand_total_zar: grandTotal,
        notes,
        status,
      }, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isValid = (editingCosting || selectedShipmentId) && grandTotal >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {editingCosting ? 'Edit File Costing' : 'Create New File Costing'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shipment Selection */}
          {!editingCosting && (
            <div className="space-y-2">
              <Label>Select Shipment</Label>
              <Select value={selectedShipmentId} onValueChange={setSelectedShipmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shipment..." />
                </SelectTrigger>
                <SelectContent>
                  {shipmentsReady?.map(shipment => (
                    <SelectItem key={shipment.id} value={shipment.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{shipment.lot_number}</span>
                        <span className="text-muted-foreground">
                          ({shipment.document_count} docs)
                        </span>
                      </div>
                    </SelectItem>
                  ))
                  }
                </SelectContent>
              </Select>
              {shipmentsReady?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No shipments available for costing
                </p>
              )}
            </div>
          )}

          {editingCosting && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">LOT Number:</span>{' '}
                <span className="font-medium">{editingCosting.lot_number}</span>
              </p>
            </div>
          )}

          {(selectedShipmentId || editingCosting) && (
            <>
              {/* Transport Documents */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-500" />
                    Transport Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {documents?.transport && documents.transport.length > 0 ? (
                    <div className="space-y-2">
                      {documents.transport.map(doc => (
                        <div key={doc.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`transport-${doc.id}`}
                            checked={selectedTransportDocs.includes(doc.id)}
                            onCheckedChange={() =>
                              handleDocToggle(doc.id, selectedTransportDocs, setSelectedTransportDocs)
                            }
                          />
                          <Label htmlFor={`transport-${doc.id}`} className="cursor-pointer">
                            {doc.file_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No transport invoices found</p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Label htmlFor="transport-cost" className="w-32">Transport Cost (ZAR)</Label>
                    <Input
                      id="transport-cost"
                      type="number"
                      value={transportCost}
                      onChange={e => setTransportCost(Number(e.target.value))}
                      className="w-40"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Clearing Documents */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-green-500" />
                    Clearing Agent Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {documents?.clearing && documents.clearing.length > 0 ? (
                    <div className="space-y-2">
                      {documents.clearing.map(doc => (
                        <div key={doc.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`clearing-${doc.id}`}
                            checked={selectedClearingDocs.includes(doc.id)}
                            onCheckedChange={() =>
                              handleDocToggle(doc.id, selectedClearingDocs, setSelectedClearingDocs)
                            }
                          />
                          <Label htmlFor={`clearing-${doc.id}`} className="cursor-pointer">
                            {doc.file_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No clearing invoices found</p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Label htmlFor="clearing-cost" className="w-32">Clearing Cost (ZAR)</Label>
                    <Input
                      id="clearing-cost"
                      type="number"
                      value={clearingCost}
                      onChange={e => setClearingCost(Number(e.target.value))}
                      className="w-40"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Other Documents */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Other Documents & Costs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {documents?.other && documents.other.length > 0 ? (
                    <div className="space-y-2">
                      {documents.other.map(doc => (
                        <div key={doc.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`other-${doc.id}`}
                            checked={selectedOtherDocs.includes(doc.id)}
                            onCheckedChange={() =>
                              handleDocToggle(doc.id, selectedOtherDocs, setSelectedOtherDocs)
                            }
                          />
                          <Label htmlFor={`other-${doc.id}`} className="cursor-pointer">
                            {doc.file_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No other documents</p>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    <Label htmlFor="other-costs" className="w-32">Other Costs (ZAR)</Label>
                    <Input
                      id="other-costs"
                      type="number"
                      value={otherCosts}
                      onChange={e => setOtherCosts(Number(e.target.value))}
                      className="w-40"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Transport</p>
                      <p className="font-medium">{formatCurrency(transportCost, 'ZAR')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Clearing</p>
                      <p className="font-medium">{formatCurrency(clearingCost, 'ZAR')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Other</p>
                      <p className="font-medium">{formatCurrency(otherCosts, 'ZAR')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Grand Total</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(grandTotal, 'ZAR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes & Status */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as FileCostingStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_review">Submit for Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || createCosting.isPending || updateCosting.isPending}
                >
                  {editingCosting ? 'Update Costing' : 'Create Costing'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
