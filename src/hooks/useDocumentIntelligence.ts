import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProcessingState {
  isUploading: boolean;
  isProcessing: boolean;
  progress: number;
  currentStep: string;
}

interface DocumentExtractionResult {
  document_type: string;
  confidence: number;
  vendor_identified?: string;
  fields: Record<string, any>;
  amounts?: {
    currency: 'ZAR' | 'USD';
    subtotal: number;
    vat: number;
    total: number;
  };
  matched_shipment_id?: string;
  auto_actions?: Array<{
    action: string;
    table: string;
    fields: string[];
  }>;
  needs_review: boolean;
  raw_text: string;
}

interface DocumentTypeDefinition {
  id: string;
  document_type: string;
  display_name: string;
  recognition_patterns: Record<string, any>;
  extraction_rules: Record<string, any>;
  field_mapping: Record<string, string>;
  vendor_name?: string | null;
  vendor_id?: string | null;
  is_active: boolean;
}

export function useDocumentIntelligence() {
  const [state, setState] = useState<ProcessingState>({
    isUploading: false,
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });

  const updateProgress = (progress: number, step: string) => {
    setState(prev => ({ ...prev, progress, currentStep: step }));
  };

  /**
   * Upload and intelligently process a document
   * Automatically detects type, extracts data, and updates shipment records
   */
  const processDocument = useCallback(async (
    file: File,
    shipmentId?: string,
    options?: {
      autoApply?: boolean;
      skipOCR?: boolean;
    }
  ): Promise<DocumentExtractionResult | null> => {
    const autoApply = options?.autoApply ?? true;
    
    setState({
      isUploading: true,
      isProcessing: false,
      progress: 0,
      currentStep: 'Uploading file...'
    });

    try {
      // 1. Upload file to storage
      updateProgress(10, 'Uploading file...');
      const filePath = `uploads/${shipmentId || 'general'}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setState(prev => ({ ...prev, isUploading: false, isProcessing: true }));
      updateProgress(30, 'Analyzing document...');

      // 2. Determine processing method based on file type
      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
      const isPdfOrImage = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
      const isFileCostingSheet = file.name.toLowerCase().includes('file_cost') || 
                                  file.name.toLowerCase().includes('costing');

      let result: DocumentExtractionResult;

      if (isExcel && isFileCostingSheet) {
        // Use specialized Excel parser for file costing sheets
        updateProgress(50, 'Parsing Excel costing sheet...');
        
        const { data, error } = await supabase.functions.invoke('parse-file-costing', {
          body: { file_path: filePath, auto_update: autoApply }
        });

        if (error) throw error;
        
        result = {
          document_type: 'file_costing_internal',
          confidence: 0.95,
          fields: data?.extracted || {},
          matched_shipment_id: data?.shipment_id,
          auto_actions: data?.auto_updates?.map((u: any) => ({
            action: 'update',
            table: u.table,
            fields: u.fields
          })),
          needs_review: false,
          raw_text: JSON.stringify(data?.extracted || {})
        };
      } else if (isPdfOrImage) {
        // Use AI-powered OCR for PDFs and images
        updateProgress(50, 'Running OCR extraction...');

        // First create queue entry
        const { data: queueEntry, error: queueError } = await supabase
          .from('document_extraction_queue')
          .insert({
            source_type: 'upload',
            original_file_path: filePath,
            status: 'pending',
            matched_shipment_id: shipmentId
          })
          .select()
          .single();

        if (queueError) throw queueError;
        
        const { data, error } = await supabase.functions.invoke('process-document-ocr', {
          body: { 
            queue_id: queueEntry.id,
            file_path: filePath, 
            shipment_id: shipmentId
          }
        });

        if (error) throw error;

        result = {
          document_type: data?.extraction?.document_type || 'unknown',
          confidence: data?.extraction?.confidence || 0,
          vendor_identified: data?.extraction?.data?.supplier_name,
          fields: data?.extraction?.data || {},
          matched_shipment_id: data?.matches?.shipment_id,
          auto_actions: data?.auto_actions?.map((a: any) => ({
            action: a.action,
            table: a.shipment_id ? 'shipment_costs' : 'unknown',
            fields: Object.keys(a.data || {})
          })),
          needs_review: data?.needs_review ?? true,
          raw_text: data?.extraction?.raw_text || ''
        };
      } else {
        // Just store without processing
        result = {
          document_type: 'unknown',
          confidence: 0,
          fields: {},
          needs_review: true,
          raw_text: ''
        };
      }

      updateProgress(90, 'Finalizing...');

      // 3. Create document record
      await supabase
        .from('uploaded_documents')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          shipment_id: result.matched_shipment_id || shipmentId,
          ai_classification: result.document_type,
          ai_confidence: result.confidence,
          extracted_data: result.fields,
          auto_linked: !!result.matched_shipment_id
        });

      updateProgress(100, 'Complete!');

      // 4. Show appropriate toast
      if (result.auto_actions && result.auto_actions.length > 0) {
        toast.success('Document Processed', {
          description: `Extracted ${result.document_type} and updated ${result.auto_actions.length} field(s) automatically.`
        });
      } else if (result.needs_review) {
        toast.warning('Review Needed', {
          description: `Document uploaded but needs manual review. Confidence: ${Math.round(result.confidence * 100)}%`
        });
      } else if (result.matched_shipment_id) {
        toast.success('Document Linked', {
          description: `Matched to shipment and ready for review.`
        });
      } else {
        toast.info('File Uploaded', {
          description: 'Document saved but could not be auto-processed.'
        });
      }

      return result;

    } catch (error) {
      console.error('Document processing error:', error);
      toast.error('Processing Failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    } finally {
      setState({
        isUploading: false,
        isProcessing: false,
        progress: 0,
        currentStep: ''
      });
    }
  }, []);

  /**
   * Get all document type definitions
   */
  const getDocumentTypes = useCallback(async (): Promise<DocumentTypeDefinition[]> => {
    const { data, error } = await supabase
      .from('document_type_definitions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch document types:', error);
      return [];
    }

    return (data || []).map(d => ({
      id: d.id,
      document_type: d.document_type,
      display_name: d.display_name,
      recognition_patterns: d.recognition_patterns as Record<string, any>,
      extraction_rules: d.extraction_rules as Record<string, any>,
      field_mapping: d.field_mapping as Record<string, string>,
      vendor_name: d.vendor_name,
      vendor_id: d.vendor_id,
      is_active: d.is_active ?? true
    }));
  }, []);

  /**
   * Get extraction queue for review
   */
  const getExtractionQueue = useCallback(async (status?: string) => {
    let query = supabase
      .from('document_extraction_queue')
      .select(`
        *,
        matched_shipment:shipments(id, lot_number),
        matched_supplier:suppliers(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch extraction queue:', error);
      return [];
    }

    return data;
  }, []);

  /**
   * Approve extraction and apply updates
   */
  const approveExtraction = useCallback(async (
    queueId: string,
    shipmentId: string,
    fieldsToApply: Record<string, any>
  ) => {
    try {
      // Update shipment costs with extracted data
      const { error: costError } = await supabase
        .from('shipment_costs')
        .upsert({
          shipment_id: shipmentId,
          ...fieldsToApply,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'shipment_id'
        });

      if (costError) throw costError;

      // Mark extraction as completed
      const { error: queueError } = await supabase
        .from('document_extraction_queue')
        .update({
          status: 'completed',
          needs_human_review: false,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', queueId);

      if (queueError) throw queueError;

      toast.success('Extraction Approved', {
        description: 'Data has been applied to the shipment.'
      });

      return true;
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Approval Failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }, []);

  /**
   * Reject extraction
   */
  const rejectExtraction = useCallback(async (queueId: string, reason?: string) => {
    const { error } = await supabase
      .from('document_extraction_queue')
      .update({
        status: 'rejected',
        needs_human_review: false,
        review_notes: reason,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', queueId);

    if (error) {
      toast.error('Failed to reject extraction');
      return false;
    }

    toast.info('Extraction Rejected');
    return true;
  }, []);

  return {
    ...state,
    processDocument,
    getDocumentTypes,
    getExtractionQueue,
    approveExtraction,
    rejectExtraction
  };
}
