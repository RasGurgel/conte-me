-- Stories: restrict writes to authenticated users; keep public read
DROP POLICY IF EXISTS "public insert stories" ON public.stories;
DROP POLICY IF EXISTS "public update stories" ON public.stories;
DROP POLICY IF EXISTS "public delete stories" ON public.stories;

CREATE POLICY "authenticated insert stories"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated update stories"
  ON public.stories FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated delete stories"
  ON public.stories FOR DELETE TO authenticated
  USING (true);

-- Storage: restrict writes to authenticated; drop broad listing policy.
-- Public file URLs continue to work because the bucket itself is public.
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
