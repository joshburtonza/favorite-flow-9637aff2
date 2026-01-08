import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, content, metadata } = await req.json();

    if (!documentId || !content) {
      return new Response(
        JSON.stringify({ error: "documentId and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Split content into chunks (simple chunking by paragraphs/sentences)
    const chunks = chunkText(content, 512, 50);
    
    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Generate embedding for the chunk
      const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: chunk,
        }),
      });

      if (!embeddingResponse.ok) {
        console.error(`Embedding error for chunk ${i}:`, await embeddingResponse.text());
        continue;
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data?.[0]?.embedding;

      if (!embedding) {
        console.error(`No embedding returned for chunk ${i}`);
        continue;
      }

      // Store chunk with embedding
      const { data, error } = await supabase
        .from("document_chunks")
        .insert({
          document_id: documentId,
          content: chunk,
          embedding,
          metadata: { ...metadata, chunk_index: i, total_chunks: chunks.length },
          chunk_index: i,
        })
        .select("id")
        .single();

      if (error) {
        console.error(`Error storing chunk ${i}:`, error);
      } else {
        results.push(data.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        chunksCreated: results.length,
        totalChunks: chunks.length,
        chunkIds: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Embed document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function chunkText(text: string, maxTokens: number = 512, overlap: number = 50): string[] {
  const chunks: string[] = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    // Rough token estimation (words * 1.3)
    const estimatedTokens = (currentChunk + paragraph).split(/\s+/).length * 1.3;
    
    if (estimatedTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      // Keep overlap from previous chunk
      const words = currentChunk.split(/\s+/);
      currentChunk = words.slice(-overlap).join(" ") + "\n\n" + paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
}
