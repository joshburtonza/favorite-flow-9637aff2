import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentWorkflow, WorkflowStatus } from '@/hooks/useDocumentWorkflow';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, Clock, CheckCircle2, XCircle, Archive, 
  Loader2, ChevronRight, RefreshCw, Eye, Calendar, Package
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface WorkflowDocument {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string | null;
  ai_classification: string | null;
  ai_confidence: number | null;
  lot_number: string | null;
  supplier_name: string | null;
  workflow_status: WorkflowStatus;
  uploaded_at: string;
  destination_folder: string | null;
  extracted_data: Record<string, unknown> | null;
}

const WORKFLOW_COLUMNS: { status: WorkflowStatus; label: string; icon: React.ElementType; color: string }[] = [
  { status: 'draft', label: 'New / Draft', icon: Clock, color: 'text-muted-foreground' },
  { status: 'pending_review', label: 'Pending Review', icon: Eye, color: 'text-warning' },
  { status: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-green-400' },
  { status: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-destructive' },
  { status: 'archived', label: 'Archived', icon: Archive, color: 'text-muted-foreground' },
];

const DocumentWorkflow = () => {
  const { isAdmin } = usePermissions();
  const { stageForReview, approveDocument, rejectDocument, archiveDocument, loading } = useDocumentWorkflow();
  const queryClient = useQueryClient();
  
  const [selectedDoc, setSelectedDoc] = useState<WorkflowDocument | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'archive' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['workflow-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('id, file_name, file_path, document_type, ai_classification, ai_confidence, lot_number, supplier_name, workflow_status, uploaded_at, destination_folder, extracted_data')
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkflowDocument[];
    },
  });

  const getDocumentsByStatus = (status: WorkflowStatus) => {
    return documents?.filter(doc => doc.workflow_status === status) || [];
  };

  const handleMoveToReview = async (doc: WorkflowDocument) => {
    try {
      await stageForReview(doc.id, doc.destination_folder || '/pending/');
      refetch();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleApprove = async () => {
    if (!selectedDoc) return;
    try {
      await approveDocument(selectedDoc.id, selectedDoc.destination_folder || undefined);
      setSelectedDoc(null);
      setActionType(null);
      refetch();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await rejectDocument(selectedDoc.id, rejectReason);
      setSelectedDoc(null);
      setActionType(null);
      setRejectReason('');
      refetch();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleArchive = async () => {
    if (!selectedDoc) return;
    try {
      await archiveDocument(selectedDoc.id);
      setSelectedDoc(null);
      setActionType(null);
      refetch();
    } catch (error) {
      // Error handled in hook
    }
  };

  const openActionDialog = (doc: WorkflowDocument, action: 'approve' | 'reject' | 'archive') => {
    setSelectedDoc(doc);
    setActionType(action);
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;
    const color = confidence >= 0.8 
      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
      : confidence >= 0.5 
        ? 'bg-warning/20 text-warning border-warning/30' 
        : 'bg-destructive/20 text-destructive border-destructive/30';
    return (
      <Badge variant="outline" className={`text-[10px] ${color}`}>
        {Math.round(confidence * 100)}%
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Document Pipeline</p>
            <h1 className="text-3xl font-semibold gradient-text">Workflow Board</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </header>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {WORKFLOW_COLUMNS.map(column => {
              const columnDocs = getDocumentsByStatus(column.status);
              const Icon = column.icon;
              
              return (
                <div 
                  key={column.status} 
                  className="glass-card p-0 min-h-[400px] flex flex-col"
                >
                  {/* Column Header */}
                  <div className="p-4 border-b border-glass-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${column.color}`} />
                      <span className="font-medium text-sm">{column.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {columnDocs.length}
                    </Badge>
                  </div>
                  
                  {/* Column Content */}
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {columnDocs.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-8">
                          No documents
                        </p>
                      ) : (
                        columnDocs.map(doc => (
                          <div 
                            key={doc.id}
                            className="p-3 rounded-lg border border-glass-border bg-background/50 hover:bg-background/80 transition-all group"
                          >
                            {/* Document Info */}
                            <div className="flex items-start gap-2 mb-2">
                              <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate" title={doc.file_name}>
                                  {doc.file_name}
                                </p>
                                <div className="flex items-center gap-1 flex-wrap mt-1">
                                  {doc.ai_classification && (
                                    <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30">
                                      {doc.ai_classification}
                                    </Badge>
                                  )}
                                  {getConfidenceBadge(doc.ai_confidence)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Meta info */}
                            <div className="text-[10px] text-muted-foreground space-y-1">
                              {doc.lot_number && (
                                <div className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  <span>LOT {doc.lot_number}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(new Date(doc.uploaded_at), 'MMM dd, HH:mm')}</span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            {isAdmin && (
                              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                {column.status === 'draft' && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 text-[10px] gap-1 flex-1"
                                    onClick={() => handleMoveToReview(doc)}
                                    disabled={loading}
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                    To Review
                                  </Button>
                                )}
                                {column.status === 'pending_review' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-6 text-[10px] gap-1 flex-1 text-green-400 hover:text-green-400 hover:bg-green-500/10"
                                      onClick={() => openActionDialog(doc, 'approve')}
                                      disabled={loading}
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Approve
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-6 text-[10px] gap-1 flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => openActionDialog(doc, 'reject')}
                                      disabled={loading}
                                    >
                                      <XCircle className="h-3 w-3" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {column.status === 'approved' && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 text-[10px] gap-1 flex-1"
                                    onClick={() => openActionDialog(doc, 'archive')}
                                    disabled={loading}
                                  >
                                    <Archive className="h-3 w-3" />
                                    Archive
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Confirmation Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedDoc(null); setRejectReason(''); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' && 'Approve Document'}
                {actionType === 'reject' && 'Reject Document'}
                {actionType === 'archive' && 'Archive Document'}
              </DialogTitle>
            </DialogHeader>
            
            {selectedDoc && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="font-medium text-sm">{selectedDoc.file_name}</p>
                  {selectedDoc.lot_number && (
                    <p className="text-xs text-muted-foreground mt-1">LOT: {selectedDoc.lot_number}</p>
                  )}
                </div>
                
                {actionType === 'reject' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rejection Reason *</label>
                    <Textarea
                      placeholder="Please provide a reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
                
                {actionType === 'approve' && (
                  <p className="text-sm text-muted-foreground">
                    This document will be marked as approved and moved to: 
                    <span className="font-mono text-xs ml-1">{selectedDoc.destination_folder || '/approved/'}</span>
                  </p>
                )}
                
                {actionType === 'archive' && (
                  <p className="text-sm text-muted-foreground">
                    This document will be moved to the archive.
                  </p>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => { setActionType(null); setSelectedDoc(null); setRejectReason(''); }}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (actionType === 'approve') handleApprove();
                  if (actionType === 'reject') handleReject();
                  if (actionType === 'archive') handleArchive();
                }}
                disabled={loading || (actionType === 'reject' && !rejectReason.trim())}
                className={
                  actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  actionType === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''
                }
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionType === 'approve' && 'Approve'}
                {actionType === 'reject' && 'Reject'}
                {actionType === 'archive' && 'Archive'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default DocumentWorkflow;
