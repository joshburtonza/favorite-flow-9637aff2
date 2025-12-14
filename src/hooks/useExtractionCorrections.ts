import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ExtractionCorrection {
  id: string;
  document_id: string;
  field_name: string;
  ai_extracted_value: string;
  user_corrected_value: string;
  corrected_by: string;
  corrected_at: string;
  document_type: string;
}

interface ExtractionStats {
  document_type: string;
  field_name: string;
  total_extractions: number;
  corrections_count: number;
  accuracy_rate: number;
}

export function useExtractionCorrections() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [corrections, setCorrections] = useState<Record<string, string>>({});

  // Track a field correction locally before saving
  const trackCorrection = useCallback((field: string, originalValue: string, newValue: string) => {
    if (originalValue !== newValue) {
      setCorrections(prev => ({
        ...prev,
        [field]: newValue,
      }));
    } else {
      setCorrections(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  }, []);

  // Save a single field correction
  const saveCorrection = useCallback(async (
    documentId: string,
    documentType: string,
    field: string,
    aiValue: string,
    userValue: string
  ) => {
    if (!user) return;
    
    try {
      // Log the correction
      const { error: correctionError } = await supabase
        .from('extraction_corrections')
        .insert({
          document_id: documentId,
          field_name: field,
          ai_extracted_value: aiValue,
          user_corrected_value: userValue,
          corrected_by: user.id,
          document_type: documentType,
        });

      if (correctionError) throw correctionError;

      // Update extraction stats
      await updateExtractionStats(documentType, field);

      // Log event
      await supabase.from('ai_event_logs').insert({
        event_type: 'ai_extraction_corrected',
        entity_type: 'document',
        entity_id: documentId,
        user_id: user.id,
        metadata: {
          field,
          ai_value: aiValue,
          corrected_to: userValue,
        },
      });
    } catch (error) {
      console.error('Error saving correction:', error);
      throw error;
    }
  }, [user]);

  // Save all corrections for a document
  const saveAllCorrections = useCallback(async (
    documentId: string,
    documentType: string,
    originalData: Record<string, unknown>,
    correctedData: Record<string, unknown>
  ) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const correctedFields: string[] = [];

      // Save each correction
      for (const [field, newValue] of Object.entries(correctedData)) {
        const originalValue = originalData[field];
        if (originalValue !== newValue) {
          await saveCorrection(
            documentId,
            documentType,
            field,
            String(originalValue || ''),
            String(newValue || '')
          );
          correctedFields.push(field);
        }
      }

      // Update document with corrected data
      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          extracted_data: correctedData as any,
          user_corrected: true,
          corrected_fields: correctedFields,
        })
        .eq('id', documentId);

      if (error) throw error;

      toast.success(`${correctedFields.length} correction(s) saved`);
      setCorrections({});
    } catch (error: any) {
      toast.error(error.message || 'Failed to save corrections');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, saveCorrection]);

  // Update extraction accuracy stats
  const updateExtractionStats = async (documentType: string, field: string) => {
    // Try to update existing stats
    const { data: existing } = await supabase
      .from('extraction_stats')
      .select('*')
      .eq('document_type', documentType)
      .eq('field_name', field)
      .single();

    if (existing) {
      const newTotal = existing.total_extractions + 1;
      const newCorrections = existing.corrections_count + 1;
      const newAccuracy = ((newTotal - newCorrections) / newTotal) * 100;

      await supabase
        .from('extraction_stats')
        .update({
          total_extractions: newTotal,
          corrections_count: newCorrections,
          accuracy_rate: newAccuracy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new stats record
      await supabase.from('extraction_stats').insert({
        document_type: documentType,
        field_name: field,
        total_extractions: 1,
        corrections_count: 1,
        accuracy_rate: 0,
      });
    }
  };

  // Get extraction stats for dashboard
  const fetchExtractionStats = useCallback(async () => {
    const { data, error } = await supabase
      .from('extraction_stats')
      .select('*')
      .order('document_type');
    
    if (error) throw error;
    return data as ExtractionStats[];
  }, []);

  // Get recent corrections
  const fetchRecentCorrections = useCallback(async (limit = 20) => {
    const { data, error } = await supabase
      .from('extraction_corrections')
      .select('*')
      .order('corrected_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as ExtractionCorrection[];
  }, []);

  // Calculate overall accuracy
  const calculateOverallAccuracy = useCallback(async () => {
    const stats = await fetchExtractionStats();
    if (!stats.length) return { overall: 100, byType: {}, byField: {} };

    const totalExtractions = stats.reduce((sum, s) => sum + s.total_extractions, 0);
    const totalCorrections = stats.reduce((sum, s) => sum + s.corrections_count, 0);
    const overall = totalExtractions > 0 
      ? ((totalExtractions - totalCorrections) / totalExtractions) * 100 
      : 100;

    // Group by document type
    const byType: Record<string, number> = {};
    const typeStats = new Map<string, { total: number; corrections: number }>();
    
    for (const stat of stats) {
      const current = typeStats.get(stat.document_type) || { total: 0, corrections: 0 };
      typeStats.set(stat.document_type, {
        total: current.total + stat.total_extractions,
        corrections: current.corrections + stat.corrections_count,
      });
    }
    
    for (const [type, data] of typeStats.entries()) {
      byType[type] = data.total > 0 
        ? ((data.total - data.corrections) / data.total) * 100 
        : 100;
    }

    // Group by field
    const byField: Record<string, number> = {};
    const fieldStats = new Map<string, { total: number; corrections: number }>();
    
    for (const stat of stats) {
      const current = fieldStats.get(stat.field_name) || { total: 0, corrections: 0 };
      fieldStats.set(stat.field_name, {
        total: current.total + stat.total_extractions,
        corrections: current.corrections + stat.corrections_count,
      });
    }
    
    for (const [field, data] of fieldStats.entries()) {
      byField[field] = data.total > 0 
        ? ((data.total - data.corrections) / data.total) * 100 
        : 100;
    }

    return { overall, byType, byField };
  }, [fetchExtractionStats]);

  return {
    loading,
    corrections,
    trackCorrection,
    saveCorrection,
    saveAllCorrections,
    fetchExtractionStats,
    fetchRecentCorrections,
    calculateOverallAccuracy,
  };
}
