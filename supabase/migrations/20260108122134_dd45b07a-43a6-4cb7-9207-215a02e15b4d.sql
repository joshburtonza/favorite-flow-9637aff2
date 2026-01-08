-- Add department_id to document_folders for department-based file access
ALTER TABLE public.document_folders 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Add department_id to uploaded_documents for direct department association
ALTER TABLE public.uploaded_documents 
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_document_folders_department ON public.document_folders(department_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_department ON public.uploaded_documents(department_id);

-- Update RLS policy for document_folders to filter by department
DROP POLICY IF EXISTS "Users can view department folders" ON public.document_folders;
CREATE POLICY "Users can view department folders" 
ON public.document_folders 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins see all
    has_role(auth.uid(), 'admin'::app_role)
    -- Users see folders in their department or with no department
    OR department_id IS NULL
    OR department_id IN (
      SELECT p.department_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
);

-- Update RLS for uploaded_documents to filter by department
DROP POLICY IF EXISTS "Users can view department documents" ON public.uploaded_documents;
CREATE POLICY "Users can view department documents" 
ON public.uploaded_documents 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- Admins see all
    has_role(auth.uid(), 'admin'::app_role)
    -- Users see docs in their department, their uploads, or with no department
    OR department_id IS NULL
    OR uploaded_by = auth.uid()
    OR department_id IN (
      SELECT p.department_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
);