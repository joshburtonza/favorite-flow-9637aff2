import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, departmentId, includeContext = true } = await req.json();
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate embedding for the query
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error("Embedding error:", await embeddingResponse.text());
      // Fallback to direct AI response without RAG context
      return await generateDirectResponse(query, LOVABLE_API_KEY, corsHeaders);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    let context = "";
    
    if (queryEmbedding && includeContext) {
      // Search for relevant documents using pgvector
      const searchResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY!,
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: 5,
          filter_department_id: departmentId || null,
        }),
      });

      if (searchResponse.ok) {
        const matches = await searchResponse.json();
        if (matches && matches.length > 0) {
          context = matches
            .map((m: any) => `[Document: ${m.metadata?.file_name || 'Unknown'}]\n${m.content}`)
            .join("\n\n---\n\n");
        }
      }
    }

    // Generate response with context
    const systemPrompt = `You are an AI assistant for a logistics management system. 
You help users with shipments, invoices, documents, suppliers, and clients.

${context ? `Here is relevant context from the document database:\n\n${context}\n\n` : ""}

Guidelines:
- Be concise and helpful
- Reference specific documents or data when available
- If you don't have enough context, ask clarifying questions
- Format responses with markdown when helpful
- For data queries, suggest using specific filters or searches`;

    const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        stream: false,
      }),
    });

    if (!chatResponse.ok) {
      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (chatResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Chat API error: ${chatResponse.status}`);
    }

    const chatData = await chatResponse.json();
    const response = chatData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(
      JSON.stringify({ 
        response,
        hasContext: !!context,
        sourcesCount: context ? context.split("---").length : 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("RAG query error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateDirectResponse(query: string, apiKey: string, corsHeaders: Record<string, string>) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { 
          role: "system", 
          content: "You are an AI assistant for a logistics management system. Help users with shipments, invoices, and documents." 
        },
        { role: "user", content: query },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate response");
  }

  const data = await response.json();
  return new Response(
    JSON.stringify({ 
      response: data.choices?.[0]?.message?.content || "I couldn't generate a response.",
      hasContext: false,
      sourcesCount: 0
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
