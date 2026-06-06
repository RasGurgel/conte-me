CREATE POLICY "admins select story-assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'story-assets' AND public.has_role(auth.uid(), 'admin'));