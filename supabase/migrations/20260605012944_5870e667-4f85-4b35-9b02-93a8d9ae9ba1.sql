-- Role enum + table (separate from any profile to avoid privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
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

-- Security-definer to avoid recursive RLS in policies that use it
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

-- Replace permissive write policies with admin-only checks on stories
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

-- Same for storage.objects in the story-assets bucket
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
