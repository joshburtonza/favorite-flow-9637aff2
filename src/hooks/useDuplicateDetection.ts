import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DuplicateMatch {
  type: 'exact_filename' | 'similar_filename' | 'invoice_number_match' | 'data_match' | 'file_hash_match';
  confidence: number;
  document: {
    id: string;
    file_name: string;
    uploaded_at: string;
    uploaded_by: string | null;
    ai_extracted_data: Record<string, unknown> | null;
    folder_id: string | null;
  };
  reason: string;
}

interface DuplicateDetectionSettings {
  duplicate_detection_enabled: boolean;
  filename_similarity_threshold: number;
  auto_block_exact_duplicates: boolean;
  check_invoice_numbers: boolean;
  duplicate_check_days: number;
}

// Calculate string similarity (Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLength;
}

// Calculate file hash using Web Crypto API
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useDuplicateDetection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  // Fetch duplicate detection settings
  const fetchSettings = useCallback(async (): Promise<DuplicateDetectionSettings> => {
    const { data, error } = await supabase
      .from('duplicate_detection_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error || !data) {
      return {
        duplicate_detection_enabled: true,
        filename_similarity_threshold: 0.85,
        auto_block_exact_duplicates: false,
        check_invoice_numbers: true,
        duplicate_check_days: 90,
      };
    }
    
    return data as DuplicateDetectionSettings;
  }, []);

  // Update duplicate detection settings
  const updateSettings = useCallback(async (settings: Partial<DuplicateDetectionSettings>) => {
    const { error } = await supabase
      .from('duplicate_detection_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update any existing row
    
    if (error) {
      toast.error('Failed to update settings');
      throw error;
    }
    
    toast.success('Settings updated');
  }, []);

  // Check for duplicates before upload
  const checkForDuplicates = useCallback(async (
    file: File,
    extractedData?: Record<string, unknown>
  ): Promise<DuplicateMatch[]> => {
    setLoading(true);
    const potentialDuplicates: DuplicateMatch[] = [];
    
    try {
      const settings = await fetchSettings();
      
      if (!settings.duplicate_detection_enabled) {
        return [];
      }
      
      // Calculate date cutoff
      const cutoffDate = settings.duplicate_check_days > 0
        ? new Date(Date.now() - settings.duplicate_check_days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      // Build base query
      let query = supabase
        .from('uploaded_documents')
        .select('id, file_name, uploaded_at, uploaded_by, extracted_data, folder_id, file_hash');
      
      if (cutoffDate) {
        query = query.gte('uploaded_at', cutoffDate);
      }
      
      const { data: existingDocs, error } = await query;
      
      if (error) throw error;
      
      const docs = (existingDocs || []) as Array<{
        id: string;
        file_name: string;
        uploaded_at: string;
        uploaded_by: string | null;
        extracted_data: Record<string, unknown> | null;
        folder_id: string | null;
        file_hash: string | null;
      }>;
      
      // Check 1: Exact filename match
      const exactMatch = docs.find(doc => 
        doc.file_name.toLowerCase() === file.name.toLowerCase()
      );
      
      if (exactMatch) {
        const docForMatch = { ...exactMatch, ai_extracted_data: exactMatch.extracted_data };
        potentialDuplicates.push({
          type: 'exact_filename',
          confidence: 1.0,
          document: docForMatch as any,
          reason: 'Identical filename',
        });
      }
      
      // Check 2: Similar filename (fuzzy match)
      if (settings.filename_similarity_threshold < 1) {
        for (const doc of docs) {
          if (doc.file_name.toLowerCase() !== file.name.toLowerCase()) {
            const similarity = calculateSimilarity(file.name, doc.file_name);
            if (similarity >= settings.filename_similarity_threshold) {
              const docForMatch = { ...doc, ai_extracted_data: doc.extracted_data };
              potentialDuplicates.push({
                type: 'similar_filename',
                confidence: similarity,
                document: docForMatch as any,
                reason: `${(similarity * 100).toFixed(0)}% filename similarity`,
              });
            }
          }
        }
      }
      
      // Check 3: Invoice number match
      if (settings.check_invoice_numbers && extractedData?.invoice_number) {
        const invoiceMatch = docs.find(doc => {
          const docData = doc.extracted_data as Record<string, unknown> | null;
          return docData?.invoice_number === extractedData.invoice_number;
        });
        
        if (invoiceMatch) {
          const docForMatch = { ...invoiceMatch, ai_extracted_data: invoiceMatch.extracted_data };
          potentialDuplicates.push({
            type: 'invoice_number_match',
            confidence: 0.95,
            document: docForMatch as any,
            reason: `Same invoice number: ${extractedData.invoice_number}`,
          });
        }
      }
      
      // Check 4: Amount + date + supplier match
      if (extractedData?.total_amount && extractedData?.invoice_date && extractedData?.supplier_name) {
        const dataMatch = docs.find(doc => {
          const docData = doc.extracted_data as Record<string, unknown> | null;
          return docData?.total_amount === extractedData.total_amount &&
                 docData?.invoice_date === extractedData.invoice_date &&
                 docData?.supplier_name === extractedData.supplier_name;
        });
        
        if (dataMatch) {
          const docForMatch = { ...dataMatch, ai_extracted_data: dataMatch.extracted_data };
          potentialDuplicates.push({
            type: 'data_match',
            confidence: 0.90,
            document: docForMatch as any,
            reason: 'Same amount, date, and supplier',
          });
        }
      }
      
      // Check 5: File hash match (exact file contents)
      const fileHash = await calculateFileHash(file);
      const hashMatch = docs.find(doc => doc.file_hash === fileHash);
      
      if (hashMatch) {
        const docForMatch = { ...hashMatch, ai_extracted_data: hashMatch.extracted_data };
        potentialDuplicates.push({
          type: 'file_hash_match',
          confidence: 1.0,
          document: docForMatch as any,
          reason: 'Identical file contents (100% match)',
        });
      }
      
      // Deduplicate by document ID
      const uniqueDuplicates = potentialDuplicates.filter((dup, index, self) =>
        index === self.findIndex(d => d.document.id === dup.document.id)
      );
      
      // Sort by confidence
      uniqueDuplicates.sort((a, b) => b.confidence - a.confidence);
      
      setDuplicates(uniqueDuplicates);
      return uniqueDuplicates;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchSettings]);

  // Replace existing document with new one
  const replaceExisting = useCallback(async (
    existingDocId: string,
    newFile: File,
    uploadFn: (file: File, folder: string) => Promise<{ id: string }>
  ) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get existing document
      const { data: existing } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', existingDocId)
        .single();
      
      if (!existing) throw new Error('Document not found');
      
      // Archive existing document
      await supabase
        .from('uploaded_documents')
        .update({
          workflow_status: 'archived',
          replaced_by: 'pending',
        })
        .eq('id', existingDocId);
      
      // Upload new file to same folder
      const newDoc = await uploadFn(newFile, existing.folder_id || '');
      
      // Link replacement
      await supabase
        .from('uploaded_documents')
        .update({ replaced_by: newDoc.id })
        .eq('id', existingDocId);
      
      // Log event
      await supabase.from('ai_event_logs').insert({
        event_type: 'document_replaced',
        entity_type: 'document',
        entity_id: newDoc.id,
        user_id: user.id,
        metadata: {
          replaced_document: existingDocId,
          reason: 'duplicate_replacement',
        },
      });
      
      toast.success('Document replaced successfully');
      setDuplicates([]);
      return newDoc;
    } catch (error: any) {
      toast.error(error.message || 'Failed to replace document');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Upload as new version
  const uploadAsNewVersion = useCallback(async (
    existingDocId: string,
    newFile: File,
    uploadFn: (file: File, folder: string) => Promise<{ id: string }>
  ) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('id', existingDocId)
        .single();
      
      if (!existing) throw new Error('Document not found');
      
      const currentVersion = existing.version || 1;
      const newVersion = currentVersion + 1;
      
      // Add version suffix to filename
      const parts = newFile.name.split('.');
      const extension = parts.pop();
      const basename = parts.join('.');
      const versionedName = `${basename}_v${newVersion}.${extension}`;
      
      // Create new file with versioned name
      const versionedFile = new File([newFile], versionedName, { type: newFile.type });
      
      // Upload new version
      const newDoc = await uploadFn(versionedFile, existing.folder_id || '');
      
      // Update new document version info
      await supabase
        .from('uploaded_documents')
        .update({
          version: newVersion,
          parent_document: existingDocId,
          is_latest_version: true,
        })
        .eq('id', newDoc.id);
      
      // Mark existing as not latest
      await supabase
        .from('uploaded_documents')
        .update({ is_latest_version: false })
        .eq('id', existingDocId);
      
      toast.success(`Uploaded as version ${newVersion}`);
      setDuplicates([]);
      return newDoc;
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload new version');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Clear duplicates state
  const clearDuplicates = useCallback(() => {
    setDuplicates([]);
  }, []);

  return {
    loading,
    duplicates,
    checkForDuplicates,
    replaceExisting,
    uploadAsNewVersion,
    clearDuplicates,
    fetchSettings,
    updateSettings,
    calculateFileHash,
  };
}
