
create table public.stories (
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
create index stories_date_idx on public.stories(date);

grant select, insert, update, delete on public.stories to anon, authenticated;
grant all on public.stories to service_role;

alter table public.stories enable row level security;

create policy "public read stories" on public.stories for select to anon, authenticated using (true);
create policy "public insert stories" on public.stories for insert to anon, authenticated with check (true);
create policy "public update stories" on public.stories for update to anon, authenticated using (true) with check (true);
create policy "public delete stories" on public.stories for delete to anon, authenticated using (true);

insert into storage.buckets (id, name, public) values ('story-assets', 'story-assets', true) on conflict (id) do nothing;

create policy "public read story-assets" on storage.objects for select to anon, authenticated using (bucket_id = 'story-assets');
create policy "public write story-assets" on storage.objects for insert to anon, authenticated with check (bucket_id = 'story-assets');
create policy "public update story-assets" on storage.objects for update to anon, authenticated using (bucket_id = 'story-assets') with check (bucket_id = 'story-assets');
create policy "public delete story-assets" on storage.objects for delete to anon, authenticated using (bucket_id = 'story-assets');
