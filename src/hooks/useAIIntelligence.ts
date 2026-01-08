import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIClassificationResult {
  document_type: string;
  confidence: number;
  reasoning: string;
  extracted_data: {
    lot_number?: string;
    supplier_name?: string;
    client_name?: string;
    invoice_number?: string;
    total_amount?: number;
    currency?: string;
    date?: string;
    commodity?: string;
    freight_cost?: number;
    clearing_cost?: number;
    transport_cost?: number;
    fx_rate?: number;
    eta?: string;
  };
  linked_shipment?: {
    id: string;
    lot_number: string;
  };
}

interface FileResult {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  lot_number?: string;
  document_type?: string;
  folder_id?: string;
}

interface AIQueryResult {
  response: string;
  context_summary?: {
    total_shipments: number;
    total_revenue: number;
    total_profit: number;
    avg_margin: number;
  };
  update_result?: {
    success: boolean;
    lot_number: string;
    updates: Record<string, any>;
  };
  file_results?: FileResult[];
}

interface AIEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string;
  timestamp: string;
  before_state?: any;
  after_state?: any;
  changes?: any;
  related_entities?: any;
  metadata?: any;
  ai_classification?: string;
  ai_extracted_data?: any;
  ai_confidence?: number;
  ai_summary?: string;
}

export function useAIClassify() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      documentContent, 
      documentId, 
      documentName 
    }: { 
      documentContent: string; 
      documentId?: string; 
      documentName?: string;
    }): Promise<AIClassificationResult> => {
      const { data, error } = await supabase.functions.invoke('ai-intelligence', {
        body: { 
          action: 'classify_document',
          documentContent,
          documentId,
          documentName
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['ai-events'] });
      
      if (result.linked_shipment) {
        toast({
          title: 'Document Classified & Linked',
          description: `${result.document_type} linked to LOT ${result.linked_shipment.lot_number}`
        });
      } else {
        toast({
          title: 'Document Classified',
          description: `Identified as ${result.document_type} (${Math.round(result.confidence * 100)}% confidence)`
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Classification Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

export function useAIQuery() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      query, 
      entityType, 
      entityId 
    }: { 
      query: string; 
      entityType?: string; 
      entityId?: string;
    }): Promise<AIQueryResult> => {
      const { data, error } = await supabase.functions.invoke('ai-intelligence', {
        body: { 
          action: 'query',
          query,
          entityType,
          entityId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onError: (error: any) => {
      if (error.message?.includes('rate limit')) {
        toast({
          title: 'Rate Limited',
          description: 'Please wait a moment before trying again.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Query Failed',
          description: error.message,
          variant: 'destructive'
        });
      }
    }
  });
}

export function useAIEvents(limit: number = 50) {
  return useQuery({
    queryKey: ['ai-events', limit],
    queryFn: async (): Promise<AIEvent[]> => {
      const { data, error } = await supabase
        .from('ai_event_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AIEvent[];
    }
  });
}

export function useAIEventsByEntity(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['ai-events', entityType, entityId],
    queryFn: async (): Promise<AIEvent[]> => {
      const { data, error } = await supabase
        .from('ai_event_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as AIEvent[];
    },
    enabled: !!entityType && !!entityId
  });
}

export function useSystemContext(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ['system-context', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-intelligence', {
        body: { 
          action: 'get_context',
          entityType,
          entityId
        }
      });

      if (error) throw error;
      return data.context;
    },
    staleTime: 30000 // Cache for 30 seconds
  });
}

// Real-time subscription to AI events
export function useRealtimeAIEvents(onNewEvent: (event: AIEvent) => void) {
  return useQuery({
    queryKey: ['realtime-ai-events-subscription'],
    queryFn: async () => {
      const channel = supabase
        .channel('ai-events-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ai_event_logs'
          },
          (payload) => {
            onNewEvent(payload.new as AIEvent);
          }
        )
        .subscribe();

      return channel;
    },
    staleTime: Infinity
  });
}