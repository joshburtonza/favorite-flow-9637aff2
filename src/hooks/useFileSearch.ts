import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Simple debounce hook
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface SearchFilters {
  query: string;
  folderId?: string | null;
  fileType?: string | null;
  tags?: string[];
  dateRange?: { start: Date | null; end: Date | null };
}

export function useFileSearch(filters: SearchFilters) {
  const debouncedQuery = useDebounceValue(filters.query, 300);

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ['file-search', debouncedQuery, filters.folderId, filters.fileType, filters.tags],
    queryFn: async () => {
      if (!debouncedQuery && !filters.tags?.length && !filters.fileType) {
        return [];
      }

      let query = supabase
        .from('uploaded_documents')
        .select('*')
        .neq('status', 'deleted')
        .order('uploaded_at', { ascending: false })
        .limit(50);

      // Text search
      if (debouncedQuery) {
        query = query.or(`file_name.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`);
      }

      // Folder filter
      if (filters.folderId) {
        query = query.eq('folder_id', filters.folderId);
      }

      // File type filter
      if (filters.fileType) {
        query = query.ilike('file_type', `%${filters.fileType}%`);
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      // Date range filter
      if (filters.dateRange?.start) {
        query = query.gte('uploaded_at', filters.dateRange.start.toISOString());
      }
      if (filters.dateRange?.end) {
        query = query.lte('uploaded_at', filters.dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!(debouncedQuery || filters.tags?.length || filters.fileType),
  });

  return {
    results,
    isLoading,
    isSearching: isFetching,
  };
}

// Get all unique tags from documents
export function useAllTags() {
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['all-document-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('tags')
        .not('tags', 'is', null);

      if (error) throw error;

      // Extract unique tags
      const allTags = new Set<string>();
      (data || []).forEach(doc => {
        if (doc.tags && Array.isArray(doc.tags)) {
          doc.tags.forEach((tag: string) => allTags.add(tag));
        }
      });

      return Array.from(allTags).sort();
    },
  });

  return { tags, isLoading };
}

// Get file type stats for filter
export function useFileTypeStats() {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ['file-type-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uploaded_documents')
        .select('file_type')
        .neq('status', 'deleted');

      if (error) throw error;

      // Count by type
      const counts: Record<string, number> = {};
      (data || []).forEach(doc => {
        const type = doc.file_type || 'unknown';
        // Simplify type
        let category = 'other';
        if (type.includes('pdf')) category = 'PDF';
        else if (type.includes('image')) category = 'Image';
        else if (type.includes('video')) category = 'Video';
        else if (type.includes('audio')) category = 'Audio';
        else if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) category = 'Spreadsheet';
        else if (type.includes('document') || type.includes('word')) category = 'Document';
        
        counts[category] = (counts[category] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  return { stats, isLoading };
}
