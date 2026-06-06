-- =============================================================
-- SETUP COMPLETO DO BANCO DE DADOS — Conte-me! Histórias Infantis
-- Execute este arquivo inteiro no SQL Editor do Supabase
-- (Dashboard → SQL Editor → New query → Run)
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. Tabela stories + storage bucket story-assets (schema base)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  date date not null,
  emoji text default '📖',
  tags text[] default '{}',
  cover_url text,
  pages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists stories_date_idx on public.stories(date);

grant select, insert, update, delete on public.stories to anon, authenticated;
grant all on public.stories to service_role;

alter table public.stories enable row level security;

create policy "public read stories" on public.stories for select to anon, authenticated using (true);
create policy "public insert stories" on public.stories for insert to anon, authenticated with check (true);
create policy "public update stories" on public.stories for update to anon, authenticated using (true) with check (true);
create policy "public delete stories" on public.stories for delete to anon, authenticated using (true);

insert into storage.buckets (id, name, public)
  values ('story-assets', 'story-assets', true)
  on conflict (id) do nothing;

create policy "public read story-assets" on storage.objects for select to anon, authenticated using (bucket_id = 'story-assets');
create policy "public write story-assets" on storage.objects for insert to anon, authenticated with check (bucket_id = 'story-assets');
create policy "public update story-assets" on storage.objects for update to anon, authenticated using (bucket_id = 'story-assets') with check (bucket_id = 'story-assets');
create policy "public delete story-assets" on storage.objects for delete to anon, authenticated using (bucket_id = 'story-assets');


-- ─────────────────────────────────────────────────────────────
-- 2. Colunas de trilha sonora em stories
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS soundtrack_url text,
  ADD COLUMN IF NOT EXISTS soundtrack_prompt text,
  ADD COLUMN IF NOT EXISTS soundtrack_style text,
  ADD COLUMN IF NOT EXISTS soundtrack_bpm int,
  ADD COLUMN IF NOT EXISTS soundtrack_intensity text,
  ADD COLUMN IF NOT EXISTS soundtrack_instruments text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS soundtrack_duration_seconds int,
  ADD COLUMN IF NOT EXISTS soundtrack_volume real DEFAULT 0.18;


-- ─────────────────────────────────────────────────────────────
-- 3. Patch de dados (silencioso em banco vazio)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  story_id uuid := 'c3d57d58-7499-43ec-8ba9-4c75c71743cc';
  cur jsonb;
  new_cover jsonb;
  new_page1 jsonb;
  rest jsonb;
  combined jsonb;
  reindexed jsonb;
BEGIN
  SELECT pages INTO cur FROM public.stories WHERE id = story_id;
  IF cur IS NULL THEN RETURN; END IF;

  new_cover := jsonb_set((cur->0) - 'audio_url', '{text}', '""'::jsonb);

  new_page1 := jsonb_build_object(
    'text', 'Billa, a menina dos olhos curiosos, vivia pertinho da floresta. Um lugar cheio de segredos.',
    'layout', 'wide-scene-soft-block',
    'text_position', 'bottom'
  );

  SELECT COALESCE(jsonb_agg(p ORDER BY ord), '[]'::jsonb)
    INTO rest
  FROM jsonb_array_elements(cur) WITH ORDINALITY AS t(p, ord)
  WHERE ord >= 2;

  combined := jsonb_build_array(new_cover) || jsonb_build_array(new_page1) || rest;

  SELECT jsonb_agg(jsonb_set(p, '{index}', to_jsonb(ord - 1)) ORDER BY ord)
    INTO reindexed
  FROM jsonb_array_elements(combined) WITH ORDINALITY AS t(p, ord);

  UPDATE public.stories
     SET pages = reindexed, updated_at = now()
   WHERE id = story_id;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 4. Coluna character_sheet em stories
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS character_sheet text;


-- ─────────────────────────────────────────────────────────────
-- 5. Restringir escrita de stories a usuários autenticados
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "public insert stories" ON public.stories;
DROP POLICY IF EXISTS "public update stories" ON public.stories;
DROP POLICY IF EXISTS "public delete stories" ON public.stories;

CREATE POLICY "authenticated insert stories"
  ON public.stories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated update stories"
  ON public.stories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated delete stories"
  ON public.stories FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "public read story-assets" ON storage.objects;
DROP POLICY IF EXISTS "public write story-assets" ON storage.objects;
DROP POLICY IF EXISTS "public update story-assets" ON storage.objects;
DROP POLICY IF EXISTS "public delete story-assets" ON storage.objects;

CREATE POLICY "authenticated insert story-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'story-assets');

CREATE POLICY "authenticated update story-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'story-assets')
  WITH CHECK (bucket_id = 'story-assets');

CREATE POLICY "authenticated delete story-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'story-assets');


-- ─────────────────────────────────────────────────────────────
-- 6. Tabela user_roles, enum app_role, função has_role,
--    políticas admin-only para stories e storage
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role'
                 AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "authenticated insert stories" ON public.stories;
DROP POLICY IF EXISTS "authenticated update stories" ON public.stories;
DROP POLICY IF EXISTS "authenticated delete stories" ON public.stories;

CREATE POLICY "admins insert stories"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update stories"
  ON public.stories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete stories"
  ON public.stories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "authenticated insert story-assets" ON storage.objects;
DROP POLICY IF EXISTS "authenticated update story-assets" ON storage.objects;
DROP POLICY IF EXISTS "authenticated delete story-assets" ON storage.objects;

CREATE POLICY "admins insert story-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'story-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update story-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'story-assets' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'story-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete story-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'story-assets' AND public.has_role(auth.uid(), 'admin'));


-- ─────────────────────────────────────────────────────────────
-- 7 + 8. Permissões de execução da função has_role
-- ─────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;


-- ─────────────────────────────────────────────────────────────
-- 9. Política SELECT em storage para admins
-- ─────────────────────────────────────────────────────────────

CREATE POLICY "admins select story-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'story-assets' AND public.has_role(auth.uid(), 'admin'));


-- ─────────────────────────────────────────────────────────────
-- 10. Trigger: auto-atribuir role 'user' no cadastro
--     + Restringir leitura de stories a autenticados
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "public read stories" ON public.stories;

CREATE POLICY "authenticated read stories"
  ON public.stories FOR SELECT TO authenticated
  USING (true);
