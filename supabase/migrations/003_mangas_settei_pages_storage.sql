-- 1. public.mangas
CREATE TABLE IF NOT EXISTS public.mangas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Manga sin título',
  genre TEXT NOT NULL DEFAULT 'Shonen',
  format TEXT NOT NULL DEFAULT 'tankobon_b6',
  color_mode TEXT NOT NULL DEFAULT 'bw',
  cover_url TEXT,
  back_cover_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mangas_user_id ON public.mangas(user_id);

-- 2. public.settei_items
CREATE TABLE IF NOT EXISTS public.settei_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id UUID NOT NULL REFERENCES public.mangas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'character' CHECK (category IN ('character', 'prop', 'location', 'lore_rule')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visual_anchors JSONB NOT NULL DEFAULT '[]'::jsonb,
  seed TEXT,
  reference_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settei_items_manga_id ON public.settei_items(manga_id);
CREATE INDEX IF NOT EXISTS idx_settei_items_user_id ON public.settei_items(user_id);

-- 3. public.manga_pages
CREATE TABLE IF NOT EXISTS public.manga_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id UUID NOT NULL REFERENCES public.mangas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  layout_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sketch_url TEXT,
  final_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manga_pages_manga_id ON public.manga_pages(manga_id);
CREATE INDEX IF NOT EXISTS idx_manga_pages_user_id ON public.manga_pages(user_id);

-- Enable Row Level Security
ALTER TABLE public.mangas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settei_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manga_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public.mangas
DO $$ BEGIN
  CREATE POLICY "mangas_select_own" ON public.mangas FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mangas_insert_own" ON public.mangas FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mangas_update_own" ON public.mangas FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "mangas_delete_own" ON public.mangas FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for public.settei_items
DO $$ BEGIN
  CREATE POLICY "settei_items_select_own" ON public.settei_items FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "settei_items_insert_own" ON public.settei_items FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "settei_items_update_own" ON public.settei_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "settei_items_delete_own" ON public.settei_items FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for public.manga_pages
DO $$ BEGIN
  CREATE POLICY "manga_pages_select_own" ON public.manga_pages FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "manga_pages_insert_own" ON public.manga_pages FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "manga_pages_update_own" ON public.manga_pages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "manga_pages_delete_own" ON public.manga_pages FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Public Storage bucket: manga-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('manga-assets', 'manga-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies on storage.objects
DO $$ BEGIN
  CREATE POLICY "manga_assets_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'manga-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "manga_assets_auth_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'manga-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "manga_assets_owner_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'manga-assets' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'manga-assets' AND auth.uid() = owner);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "manga_assets_owner_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'manga-assets' AND auth.uid() = owner);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
