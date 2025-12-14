import { useState, useEffect } from 'react';
import { useDocumentWorkflow, suggestDestinationFolder, WorkflowStatus } from '@/hooks/useDocumentWorkflow';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, FolderInput, FileText, AlertTriangle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PendingDocument {
  id: string;
  file_name: string;
  workflow_status: WorkflowStatus;
  uploaded_at: string;
  uploaded_by: string | null;
  ai_classification: string | null;
  ai_confidence: number | null;
  ai_extracted_data: Record<string, unknown> | null;
  destination_folder: string | null;
  folder_id: string | null;
}

const FOLDER_OPTIONS = [
  { value: '/statements/', label: 'Statements' },
  { value: '/invoices/', label: 'Invoices' },
  { value: '/shipments/', label: 'Shipments' },
  { value: '/packing_lists/', label: 'Packing Lists' },
  { value: '/shipping_documents/', label: 'Shipping Documents' },
  { value: '/clearing_agent_docs/', label: 'Clearing Agent Docs' },
  { value: '/transport_invoices/', label: 'Transport Invoices' },
  { value: '/payment_proofs/', label: 'Payment Proofs' },
  { value: '/new_shipping_documents/', label: 'New Shipping Documents (Staging)' },
];

export function DocumentReviewQueue() {
  const { isAdmin } = usePermissions();
  const { 
    loading, 
    fetchPendingDocuments, 
    approveDocument, 
    rejectDocument, 
    bulkApprove 
  } = useDocumentWorkflow();
  
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [destinations, setDestinations] = useState<Record<string, string>>({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setFetchLoading(true);
    try {
      const docs = await fetchPendingDocuments();
      setDocuments(docs as unknown as PendingDocument[]);
      
      // Set initial destinations based on AI suggestions
      const initialDestinations: Record<string, string> = {};
      for (const doc of docs as unknown as PendingDocument[]) {
        initialDestinations[doc.id] = doc.destination_folder || 
          suggestDestinationFolder(doc.ai_classification, doc.ai_extracted_data as Record<string, unknown>);
      }
      setDestinations(initialDestinations);
    } catch (error) {
      console.error('Error loading pending documents:', error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleApprove = async (docId: string) => {
    try {
      await approveDocument(docId, destinations[docId]);
      await loadDocuments();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleReject = async () => {
    if (!rejectingDocId || !rejectReason) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    try {
      await rejectDocument(rejectingDocId, rejectReason);
      setRejectDialogOpen(false);
      setRejectingDocId(null);
      setRejectReason('');
      await loadDocuments();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleBulkApprove = async () => {
    if (selectedDocs.size === 0) {
      toast.error('No documents selected');
      return;
    }
    
    try {
      await bulkApprove(Array.from(selectedDocs));
      setSelectedDocs(new Set());
      await loadDocuments();
    } catch (error) {
      // Error already handled in hook
    }
  };

  const toggleDocSelection = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.id)));
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Admin access required to review documents</p>
        </CardContent>
      </Card>
    );
  }

  if (fetchLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5" />
            Document Review Queue
          </CardTitle>
          <CardDescription>
            Documents pending review and approval
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <p className="text-muted-foreground">All documents have been reviewed!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderInput className="h-5 w-5" />
                Document Review Queue
              </CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 ? 's' : ''} pending review
              </CardDescription>
            </div>
            
            {selectedDocs.size > 0 && (
              <Button onClick={handleBulkApprove} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve Selected ({selectedDocs.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={selectedDocs.size === documents.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all
              </span>
            </div>

            {/* Document Cards */}
            {documents.map((doc) => (
              <Card key={doc.id} className="border-l-4 border-l-yellow-500">
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedDocs.has(doc.id)}
                      onCheckedChange={() => toggleDocSelection(doc.id)}
                    />
                    
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{doc.file_name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Uploaded {format(new Date(doc.uploaded_at || new Date()), 'PPp')}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {doc.ai_classification && (
                            <Badge variant="outline">
                              {doc.ai_classification}
                            </Badge>
                          )}
                          {doc.ai_confidence && (
                            <Badge 
                              variant={doc.ai_confidence > 0.9 ? 'default' : 
                                       doc.ai_confidence > 0.7 ? 'secondary' : 'destructive'}
                            >
                              {(doc.ai_confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Extracted Data Preview */}
                      {doc.ai_extracted_data && Object.keys(doc.ai_extracted_data).length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs font-medium mb-2">AI Extracted Data:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            {Object.entries(doc.ai_extracted_data).slice(0, 6).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{key}: </span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Destination Folder */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-1 block">Move to folder:</label>
                          <Select
                            value={destinations[doc.id] || ''}
                            onValueChange={(value) => setDestinations(prev => ({
                              ...prev,
                              [doc.id]: value
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination folder" />
                            </SelectTrigger>
                            <SelectContent>
                              {FOLDER_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex gap-2 pt-6">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(doc.id)}
                            disabled={loading}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectingDocId(doc.id);
                              setRejectDialogOpen(true);
                            }}
                            disabled={loading}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. The uploader will be notified.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={loading || !rejectReason}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
