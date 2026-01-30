import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseExcelWithFormatting, FormatMetadata } from '@/lib/documentFormats/excelPreserver';

interface UploadResult {
  id: string;
  file_name: string;
  file_path: string;
  format_metadata: FormatMetadata | null;
}

interface UploadOptions {
  shipmentId?: string;
  documentType?: string;
  folderId?: string;
  preserveFormatting?: boolean;
}

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  /**
   * Upload a document with optional format preservation for Excel files
   */
  const uploadWithFormatPreservation = useCallback(async (
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult | null> => {
    const { shipmentId, documentType, folderId, preserveFormatting = true } = options;
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const buffer = await file.arrayBuffer();
      setUploadProgress(20);

      // Parse formatting if Excel file
      let formatMetadata: FormatMetadata | null = null;
      let parsedStructure: any = null;

      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      
      if (isExcel && preserveFormatting) {
        try {
          const parsed = await parseExcelWithFormatting(buffer);
          formatMetadata = parsed.metadata;
          parsedStructure = parsed.structure;
          setUploadProgress(40);
        } catch (parseError) {
          console.warn('Failed to parse Excel formatting:', parseError);
          // Continue without format preservation
        }
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const folder = shipmentId || folderId || 'general';
      const filePath = `uploads/${folder}/${timestamp}_${sanitizedName}`;

      setUploadProgress(50);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      setUploadProgress(80);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create document record with format metadata
      const { data: doc, error: docError } = await supabase
        .from('uploaded_documents')
        .insert({
          file_name: file.name,
          original_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          shipment_id: shipmentId || null,
          folder_id: folderId || null,
          document_type: documentType || 'general',
          status: 'new',
          uploaded_by: user?.id,
          format_metadata: formatMetadata || {},
          parsed_structure: parsedStructure || {}
        })
        .select()
        .single();

      if (docError) throw docError;
      setUploadProgress(100);

      toast({
        title: 'Upload successful',
        description: formatMetadata 
          ? `${file.name} uploaded with formatting preserved (${formatMetadata.total_rows} rows)`
          : `${file.name} uploaded successfully`,
      });

      return {
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        format_metadata: formatMetadata
      };

    } catch (error: any) {
      console.error('Document upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload document',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [toast]);

  /**
   * Upload multiple documents with format preservation
   */
  const uploadMultipleWithFormatPreservation = useCallback(async (
    files: File[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await uploadWithFormatPreservation(files[i], options);
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }, [uploadWithFormatPreservation]);

  /**
   * Re-extract formatting from an existing uploaded document
   */
  const reExtractFormatting = useCallback(async (documentId: string): Promise<boolean> => {
    try {
      // Get document record
      const { data: doc, error: fetchError } = await supabase
        .from('uploaded_documents')
        .select('file_path, file_name')
        .eq('id', documentId)
        .single();

      if (fetchError || !doc) throw new Error('Document not found');

      // Download file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (downloadError || !fileData) throw new Error('Failed to download file');

      const buffer = await fileData.arrayBuffer();

      // Check if Excel
      const isExcel = doc.file_name.endsWith('.xlsx') || doc.file_name.endsWith('.xls');
      if (!isExcel) {
        toast({
          title: 'Not an Excel file',
          description: 'Format extraction only works for Excel files',
          variant: 'destructive',
        });
        return false;
      }

      // Parse formatting
      const { structure, metadata } = await parseExcelWithFormatting(buffer);

      // Update document record
      const { error: updateError } = await supabase
        .from('uploaded_documents')
        .update({
          format_metadata: JSON.parse(JSON.stringify(metadata)),
          parsed_structure: JSON.parse(JSON.stringify(structure))
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      toast({
        title: 'Formatting extracted',
        description: `Found ${metadata.total_rows} rows, ${metadata.has_formulas ? 'with formulas' : 'no formulas'}`,
      });

      return true;
    } catch (error: any) {
      console.error('Format extraction error:', error);
      toast({
        title: 'Extraction failed',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    uploadWithFormatPreservation,
    uploadMultipleWithFormatPreservation,
    reExtractFormatting,
    isUploading,
    uploadProgress
  };
}
