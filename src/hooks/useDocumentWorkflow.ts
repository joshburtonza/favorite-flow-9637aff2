import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export type WorkflowStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';

interface WorkflowHistoryEntry {
  from_status: string;
  to_status: string;
  by_user: string;
  at: string;
  action: string;
  from_folder?: string;
  to_folder?: string;
  reason?: string;
}

// Suggest destination folder based on document type and extracted data
export function suggestDestinationFolder(
  classification: string | null,
  extractedData: Record<string, unknown> | null
): string {
  if (!classification) return '/new_shipping_documents/';
  
  const data = extractedData || {};
  const lotNumber = data.lot_number as string;
  const supplierName = data.supplier_name as string;
  const clearingAgent = data.clearing_agent as string;
  
  const suggestions: Record<string, string> = {
    'supplier_invoice': supplierName ? `/statements/${supplierName}/` : '/statements/',
    'invoice': supplierName ? `/statements/${supplierName}/` : '/invoices/',
    'telex_release': lotNumber ? `/shipments/${lotNumber}/` : '/shipments/',
    'packing_list': lotNumber ? `/shipments/${lotNumber}/` : '/packing_lists/',
    'clearing_invoice': clearingAgent ? `/clearing_agent_docs/${clearingAgent}/` : '/clearing_agent_docs/',
    'bill_of_lading': lotNumber ? `/shipments/${lotNumber}/shipping_documents/` : '/shipping_documents/',
    'transport_invoice': '/transport_invoices/',
    'payment_proof': '/payment_proofs/',
  };
  
  return suggestions[classification.toLowerCase()] || '/new_shipping_documents/';
}

export function useDocumentWorkflow() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Get pending review documents
  const fetchPendingDocuments = useCallback(async () => {
    const { data, error } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('workflow_status', 'pending_review')
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }, []);

  // Stage document for review
  const stageForReview = useCallback(async (
    documentId: string, 
    destinationFolder: string
  ) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: doc } = await supabase
        .from('uploaded_documents')
        .select('workflow_history, folder_id')
        .eq('id', documentId)
        .single();

      const currentHistory = Array.isArray(doc?.workflow_history) ? doc.workflow_history : [];
      
      const newHistory: WorkflowHistoryEntry = {
        from_status: 'draft',
        to_status: 'pending_review',
        by_user: user.id,
        at: new Date().toISOString(),
        action: 'staged_for_review',
      };

      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          workflow_status: 'pending_review' as const,
          requires_approval: true,
          destination_folder: destinationFolder,
          workflow_history: [...currentHistory, newHistory] as unknown as Json,
        })
        .eq('id', documentId);

      if (error) throw error;
      toast.success('Document staged for review');
    } catch (error: any) {
      toast.error(error.message || 'Failed to stage document');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Approve document and move to destination
  const approveDocument = useCallback(async (
    documentId: string,
    destinationFolder?: string
  ) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: doc } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (!doc) throw new Error('Document not found');

      const finalDestination = destinationFolder || doc.destination_folder || doc.folder_id;

      const newHistory: WorkflowHistoryEntry = {
        from_status: doc.workflow_status as WorkflowStatus,
        to_status: 'approved',
        by_user: user.id,
        at: new Date().toISOString(),
        action: 'approved_and_moved',
        from_folder: doc.folder_id,
        to_folder: finalDestination,
      };

      const existingHistory = Array.isArray(doc.workflow_history) ? doc.workflow_history : [];

      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          workflow_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          folder_id: finalDestination,
          workflow_history: [...existingHistory, newHistory] as unknown as Json,
        })
        .eq('id', documentId);

      if (error) throw error;

      // Log the event
      await supabase.from('ai_event_logs').insert({
        event_type: 'document_approved',
        entity_type: 'document',
        entity_id: documentId,
        user_id: user.id,
        metadata: {
          moved_from: doc.folder_id,
          moved_to: finalDestination,
        },
      });

      // Notify uploader
      if (doc.uploaded_by) {
        await supabase.from('admin_notifications').insert({
          user_id: doc.uploaded_by,
          notification_type: 'document_approved',
          title: 'Document approved',
          message: `${doc.file_name} has been approved`,
          severity: 'info',
        });
      }

      toast.success('Document approved and moved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve document');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reject document
  const rejectDocument = useCallback(async (
    documentId: string,
    reason: string
  ) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: doc } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (!doc) throw new Error('Document not found');

      const newHistory: WorkflowHistoryEntry = {
        from_status: doc.workflow_status as WorkflowStatus,
        to_status: 'rejected',
        by_user: user.id,
        at: new Date().toISOString(),
        action: 'rejected',
        reason,
      };

      const existingHistory = Array.isArray(doc.workflow_history) ? doc.workflow_history : [];

      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          workflow_status: 'rejected',
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          workflow_history: [...existingHistory, newHistory] as unknown as Json,
        })
        .eq('id', documentId);

      if (error) throw error;

      // Notify uploader
      if (doc.uploaded_by) {
        await supabase.from('admin_notifications').insert({
          user_id: doc.uploaded_by,
          notification_type: 'document_rejected',
          title: 'Document rejected',
          message: `${doc.file_name} was rejected. Reason: ${reason}`,
          severity: 'warning',
        });
      }

      toast.success('Document rejected');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject document');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Bulk approve documents
  const bulkApprove = useCallback(async (documentIds: string[]) => {
    setLoading(true);
    try {
      for (const docId of documentIds) {
        await approveDocument(docId);
      }
      toast.success(`${documentIds.length} documents approved`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to bulk approve');
    } finally {
      setLoading(false);
    }
  }, [approveDocument]);

  // Archive document
  const archiveDocument = useCallback(async (documentId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: doc } = await supabase
        .from('uploaded_documents')
        .select('workflow_history')
        .eq('id', documentId)
        .single();

      const newHistory: WorkflowHistoryEntry = {
        from_status: 'approved',
        to_status: 'archived',
        by_user: user.id,
        at: new Date().toISOString(),
        action: 'archived',
      };

      const existingHistory = Array.isArray(doc?.workflow_history) ? doc.workflow_history : [];

      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          workflow_status: 'archived',
          workflow_history: [...existingHistory, newHistory] as unknown as Json,
        })
        .eq('id', documentId);

      if (error) throw error;
      toast.success('Document archived');
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive document');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    fetchPendingDocuments,
    stageForReview,
    approveDocument,
    rejectDocument,
    bulkApprove,
    archiveDocument,
    suggestDestinationFolder,
  };
}
