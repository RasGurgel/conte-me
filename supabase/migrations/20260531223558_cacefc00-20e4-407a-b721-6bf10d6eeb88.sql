
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS soundtrack_url text,
  ADD COLUMN IF NOT EXISTS soundtrack_prompt text,
  ADD COLUMN IF NOT EXISTS soundtrack_style text,
  ADD COLUMN IF NOT EXISTS soundtrack_bpm int,
  ADD COLUMN IF NOT EXISTS soundtrack_intensity text,
  ADD COLUMN IF NOT EXISTS soundtrack_instruments text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS soundtrack_duration_seconds int,
  ADD COLUMN IF NOT EXISTS soundtrack_volume real DEFAULT 0.18;
