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

  -- Capa silenciosa: zera texto e remove áudio (mantém image_url, layout=cover).
  new_cover := jsonb_set((cur->0) - 'audio_url', '{text}', '""'::jsonb);

  -- Nova página com o texto que estava na capa.
  new_page1 := jsonb_build_object(
    'text', 'Billa, a menina dos olhos curiosos, vivia pertinho da floresta. Um lugar cheio de segredos.',
    'layout', 'wide-scene-soft-block',
    'text_position', 'bottom'
  );

  -- Demais páginas (índices >= 1 no array original).
  SELECT COALESCE(jsonb_agg(p ORDER BY ord), '[]'::jsonb)
    INTO rest
  FROM jsonb_array_elements(cur) WITH ORDINALITY AS t(p, ord)
  WHERE ord >= 2;

  combined := jsonb_build_array(new_cover) || jsonb_build_array(new_page1) || rest;

  -- Reindexa.
  SELECT jsonb_agg(jsonb_set(p, '{index}', to_jsonb(ord - 1)) ORDER BY ord)
    INTO reindexed
  FROM jsonb_array_elements(combined) WITH ORDINALITY AS t(p, ord);

  UPDATE public.stories
     SET pages = reindexed,
         updated_at = now()
   WHERE id = story_id;
END $$;