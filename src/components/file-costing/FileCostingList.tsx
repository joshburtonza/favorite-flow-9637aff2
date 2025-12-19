import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Trash2, Eye, CheckCircle, Clock, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFileCostings, useDeleteFileCosting, useFinalizeFileCosting, FileCosting } from '@/hooks/useFileCostings';
import { downloadFileCostingPDF } from '@/lib/file-costing-pdf';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';

interface FileCostingListProps {
  onEdit: (costing: FileCosting) => void;
}

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-yellow-500/20 text-yellow-400',
  finalized: 'bg-green-500/20 text-green-400',
};

const statusLabels = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  finalized: 'Finalized',
};

export function FileCostingList({ onEdit }: FileCostingListProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const { data: costings, isLoading } = useFileCostings();
  const deleteCosting = useDeleteFileCosting();
  const finalizeCosting = useFinalizeFileCosting();

  const filteredCostings = costings?.filter(c => {
    if (activeTab === 'all') return true;
    return c.status === activeTab;
  }) || [];

  const handleDownloadPDF = async (costing: FileCosting) => {
    // Fetch shipment details and document names for the PDF
    const { data: shipment } = await supabase
      .from('v_shipments_full')
      .select('lot_number, supplier_name, client_name, commodity, status')
      .eq('id', costing.shipment_id)
      .single();

    const { data: docs } = await supabase
      .from('uploaded_documents')
      .select('id, file_name');

    const docMap = new Map((docs || []).map(d => [d.id, d.file_name]));

    const transportDocNames = costing.transport_documents.map(id => docMap.get(id) || 'Unknown');
    const clearingDocNames = costing.clearing_documents.map(id => docMap.get(id) || 'Unknown');
    const otherDocNames = costing.other_documents.map(id => docMap.get(id) || 'Unknown');

    downloadFileCostingPDF({
      ...costing,
      shipment: shipment || undefined,
      transportDocNames,
      clearingDocNames,
      otherDocNames,
    });
  };

  const counts = {
    all: costings?.length || 0,
    draft: costings?.filter(c => c.status === 'draft').length || 0,
    pending_review: costings?.filter(c => c.status === 'pending_review').length || 0,
    finalized: costings?.filter(c => c.status === 'finalized').length || 0,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Loading file costings...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          File Costings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({counts.draft})</TabsTrigger>
            <TabsTrigger value="pending_review">Pending ({counts.pending_review})</TabsTrigger>
            <TabsTrigger value="finalized">Finalized ({counts.finalized})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredCostings.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No file costings found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LOT Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Transport</TableHead>
                    <TableHead className="text-right">Clearing</TableHead>
                    <TableHead className="text-right">Other</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCostings.map((costing) => (
                    <TableRow key={costing.id}>
                      <TableCell className="font-medium">{costing.lot_number || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[costing.status]}>
                          {statusLabels[costing.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(costing.transport_cost_zar, 'ZAR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(costing.clearing_cost_zar, 'ZAR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(costing.other_costs_zar, 'ZAR')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(costing.grand_total_zar, 'ZAR')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(costing.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {costing.status !== 'finalized' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(costing)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => finalizeCosting.mutate(costing.id)}
                                title="Finalize"
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPDF(costing)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {costing.status === 'draft' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Delete">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete File Costing?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the costing for LOT {costing.lot_number}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCosting.mutate(costing.id)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
