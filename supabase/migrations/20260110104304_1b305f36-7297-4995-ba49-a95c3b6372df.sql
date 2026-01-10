-- Create tables, indexes, RLS, functions for file management
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('file', 'folder')),
    item_id UUID NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS public.file_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    document_id UUID REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
    accessed_at TIMESTAMPTZ DEFAULT now(),
    action_type TEXT DEFAULT 'view'
);

CREATE TABLE IF NOT EXISTS public.file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_hash TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    is_current BOOLEAN DEFAULT false,
    UNIQUE(document_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL,
    share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_by UUID NOT NULL,
    shared_with_email TEXT,
    permission TEXT NOT NULL DEFAULT 'view',
    is_public BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.storage_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    storage_limit_bytes BIGINT NOT NULL,
    is_default BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.user_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    used_bytes BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.file_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action_type TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id UUID,
    item_name TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.storage_plans (name, storage_limit_bytes, is_default)
VALUES ('Standard', 10737418240, true) ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_file_access_log_user ON public.file_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_doc ON public.file_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_shares_token ON public.shares(share_token);
CREATE INDEX IF NOT EXISTS idx_uploaded_documents_tags ON public.uploaded_documents USING GIN(tags);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fav_select" ON public.user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fav_insert" ON public.user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete" ON public.user_favorites FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "fav_update" ON public.user_favorites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "access_select" ON public.file_access_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "access_insert" ON public.file_access_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "versions_select" ON public.file_versions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "versions_insert" ON public.file_versions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "shares_select" ON public.shares FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "shares_insert" ON public.shares FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "shares_delete" ON public.shares FOR DELETE USING (auth.uid() = created_by);
CREATE POLICY "plans_select" ON public.storage_plans FOR SELECT USING (true);
CREATE POLICY "storage_select" ON public.user_storage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "storage_insert" ON public.user_storage FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "activity_select" ON public.file_activity_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "activity_insert" ON public.file_activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);