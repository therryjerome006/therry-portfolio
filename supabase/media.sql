-- Journal Media, indépendant du blog.
-- Les fichiers vivent dans Supabase Storage. Ces tables ne gardent que les métadonnées.

create table if not exists public.media_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  type text not null check (type in ('photo', 'video', 'gallery', 'mixed', 'update')),
  category text not null,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  article_path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.media_posts (id) on delete cascade,
  type text not null check (type in ('image', 'video', 'youtube', 'vimeo')),
  url text not null,
  thumbnail_url text not null default '',
  alt_text text not null default '',
  caption text not null default '',
  sort_order integer not null default 0,
  file_name text not null default '',
  file_size bigint,
  width integer,
  height integer,
  duration_seconds numeric,
  mime_type text not null default '',
  bucket text not null default '',
  storage_path text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists media_posts_status_published_idx
  on public.media_posts (status, published_at desc);

create index if not exists media_items_post_order_idx
  on public.media_items (post_id, sort_order);

alter table public.media_posts enable row level security;
alter table public.media_items enable row level security;

drop policy if exists "published media posts are public" on public.media_posts;
create policy "published media posts are public"
  on public.media_posts
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "published media items are public" on public.media_items;
create policy "published media items are public"
  on public.media_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.media_posts as posts
      where posts.id = media_items.post_id
        and posts.status = 'published'
    )
  );

insert into storage.buckets (id, name, public)
values
  ('media-images', 'media-images', true),
  ('media-videos', 'media-videos', true),
  ('media-thumbnails', 'media-thumbnails', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "media public read" on storage.objects;
create policy "media public read"
  on storage.objects
  for select
  to public
  using (bucket_id in ('media-images', 'media-videos', 'media-thumbnails'));

-- L'écriture passe par SUPABASE_SECRET_KEY sur le serveur. Pas d'insert public.
drop policy if exists "media upload" on storage.objects;
drop policy if exists "media replace" on storage.objects;
drop policy if exists "media delete" on storage.objects;
