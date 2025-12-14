
-- Phase 1: Document Folder System

-- Create folder type enum
CREATE TYPE public.folder_type AS ENUM ('system', 'staff', 'clearing_agent', 'custom');

-- Create document status enum
CREATE TYPE public.document_status AS ENUM ('new', 'in_progress', 'finalized');

-- Create document_folders table
CREATE TABLE public.document_folders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
    folder_type public.folder_type NOT NULL DEFAULT 'custom',
    assigned_staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    order_position INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id and status to uploaded_documents
ALTER TABLE public.uploaded_documents 
ADD COLUMN folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL,
ADD COLUMN status public.document_status DEFAULT 'new';

-- Enable RLS on document_folders
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_folders
CREATE POLICY "Authenticated users can view folders"
ON public.document_folders
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage folders"
ON public.document_folders
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view assigned folders"
ON public.document_folders
FOR SELECT
USING (assigned_staff_id = auth.uid() OR folder_type = 'system');

-- Seed default folder structure
INSERT INTO public.document_folders (name, folder_type, order_position) VALUES
('Statements', 'system', 1),
('Shipments', 'system', 2),
('Shipping Documents To Do', 'system', 3),
('New Shipping Documents', 'system', 4),
('EFT Copies', 'system', 5),
('TT Copies', 'system', 6);

-- Create Clearing Agents parent folder
INSERT INTO public.document_folders (name, folder_type, order_position) VALUES
('Clearing Agents', 'system', 7);

-- Get the clearing agents folder ID and insert subfolders
DO $$
DECLARE
    clearing_folder_id UUID;
BEGIN
    SELECT id INTO clearing_folder_id FROM public.document_folders WHERE name = 'Clearing Agents';
    
    INSERT INTO public.document_folders (name, parent_id, folder_type, order_position) VALUES
    ('Sanjit', clearing_folder_id, 'clearing_agent', 1),
    ('Agent A', clearing_folder_id, 'clearing_agent', 2),
    ('Agent B', clearing_folder_id, 'clearing_agent', 3),
    ('Agent C', clearing_folder_id, 'clearing_agent', 4);
END $$;

-- Create Staff Folders parent
INSERT INTO public.document_folders (name, folder_type, order_position) VALUES
('Staff Folders', 'system', 8);

-- Get staff folders parent and insert staff subfolders
DO $$
DECLARE
    staff_folder_id UUID;
BEGIN
    SELECT id INTO staff_folder_id FROM public.document_folders WHERE name = 'Staff Folders';
    
    INSERT INTO public.document_folders (name, parent_id, folder_type, order_position) VALUES
    ('Abdul', staff_folder_id, 'staff', 1),
    ('Marissa', staff_folder_id, 'staff', 2),
    ('Shamima', staff_folder_id, 'staff', 3);
END $$;

-- Phase 2: Custom Tables System (Airtable-like)

-- Create column type enum
CREATE TYPE public.column_type AS ENUM ('text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'currency', 'link', 'email', 'phone');

-- Create custom_tables table
CREATE TABLE public.custom_tables (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'table',
    is_system BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom_columns table
CREATE TABLE public.custom_columns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id UUID NOT NULL REFERENCES public.custom_tables(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    column_type public.column_type NOT NULL DEFAULT 'text',
    options JSONB DEFAULT '{}',
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    order_position INTEGER DEFAULT 0,
    width INTEGER DEFAULT 150,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom_rows table
CREATE TABLE public.custom_rows (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id UUID NOT NULL REFERENCES public.custom_tables(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on custom tables
ALTER TABLE public.custom_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_rows ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_tables
CREATE POLICY "Authenticated users can view tables"
ON public.custom_tables FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create tables"
ON public.custom_tables FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all tables"
ON public.custom_tables FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can manage their tables"
ON public.custom_tables FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their tables"
ON public.custom_tables FOR DELETE
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for custom_columns
CREATE POLICY "Authenticated users can view columns"
ON public.custom_columns FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage columns"
ON public.custom_columns FOR ALL
USING (auth.uid() IS NOT NULL);

-- RLS policies for custom_rows
CREATE POLICY "Authenticated users can view rows"
ON public.custom_rows FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert rows"
ON public.custom_rows FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rows"
ON public.custom_rows FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete rows"
ON public.custom_rows FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_columns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_rows;

-- Create updated_at triggers
CREATE TRIGGER update_document_folders_updated_at
BEFORE UPDATE ON public.document_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_tables_updated_at
BEFORE UPDATE ON public.custom_tables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_rows_updated_at
BEFORE UPDATE ON public.custom_rows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
