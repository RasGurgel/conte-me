-- Auto-assign 'user' role when a new auth user is created
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

-- Restrict story reads to authenticated users only (remove anonymous access)
DROP POLICY IF EXISTS "public read stories" ON public.stories;

CREATE POLICY "authenticated read stories"
  ON public.stories FOR SELECT TO authenticated
  USING (true);
