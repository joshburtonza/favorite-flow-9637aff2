-- Add enhanced columns to uploaded_documents
ALTER TABLE public.uploaded_documents
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_name TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add soft delete and organization columns to document_folders
ALTER TABLE public.document_folders 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS color VARCHAR(7),
ADD COLUMN IF NOT EXISTS icon VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;