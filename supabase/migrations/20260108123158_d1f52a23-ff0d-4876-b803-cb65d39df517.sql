-- Enable vector extension for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Document chunks table for RAG
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  chunk_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_chunks (inherit from parent document access)
CREATE POLICY "Users can view chunks for documents they can access"
ON public.document_chunks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.uploaded_documents ud
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE ud.id = document_chunks.document_id
    AND (
      ud.department_id IS NULL 
      OR ud.department_id = p.department_id
      OR public.has_role(auth.uid(), 'admin')
    )
  )
);

-- Create index for similarity search
CREATE INDEX document_chunks_embedding_idx ON public.document_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function for semantic search
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN uploaded_documents ud ON ud.id = dc.document_id
  WHERE 
    1 - (dc.embedding <=> query_embedding) > match_threshold
    AND (filter_department_id IS NULL OR ud.department_id = filter_department_id)
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;