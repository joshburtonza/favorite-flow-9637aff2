import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RAGQueryResult {
  response: string;
  hasContext: boolean;
  sourcesCount: number;
}

interface EmbedResult {
  success: boolean;
  chunksCreated: number;
  totalChunks: number;
  chunkIds: string[];
}

export function useRAGQuery() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      query, 
      departmentId 
    }: { 
      query: string; 
      departmentId?: string;
    }): Promise<RAGQueryResult> => {
      const { data, error } = await supabase.functions.invoke("rag-query", {
        body: { query, departmentId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onError: (error: Error) => {
      if (error.message.includes("Rate limit")) {
        toast({
          title: "Rate Limited",
          description: "Please wait a moment before trying again.",
          variant: "destructive",
        });
      } else if (error.message.includes("credits")) {
        toast({
          title: "Credits Exhausted",
          description: "Please add funds to continue using AI features.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Query Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });
}

export function useEmbedDocument() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      documentId,
      content,
      metadata,
    }: {
      documentId: string;
      content: string;
      metadata?: Record<string, any>;
    }): Promise<EmbedResult> => {
      const { data, error } = await supabase.functions.invoke("embed-document", {
        body: { documentId, content, metadata },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Document Indexed",
        description: `Created ${data.chunksCreated} searchable chunks.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Indexing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDocumentChunks(documentId?: string) {
  return useQuery({
    queryKey: ["document-chunks", documentId],
    queryFn: async () => {
      if (!documentId) return [];
      
      const { data, error } = await supabase
        .from("document_chunks")
        .select("id, content, metadata, chunk_index, created_at")
        .eq("document_id", documentId)
        .order("chunk_index");

      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });
}

export function useSemanticSearch() {
  return useMutation({
    mutationFn: async ({
      query,
      departmentId,
      limit = 10,
    }: {
      query: string;
      departmentId?: string;
      limit?: number;
    }) => {
      // This calls the RAG query but only returns the context, not the AI response
      const { data, error } = await supabase.functions.invoke("rag-query", {
        body: { 
          query, 
          departmentId,
          includeContext: true,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}
