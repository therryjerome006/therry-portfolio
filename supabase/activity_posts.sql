-- Publications des réalisations. Les fichiers restent dans Supabase Storage.
-- La description appartient à la publication. Les photos sont des éléments séparés.

create table if not exists public.activity_posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in (
      'Sport',
      'Échecs',
      'Compétitions',
      'Vie scolaire',
      'Événements',
      'Projets personnels'
    )
  ),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.activity_items (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.activity_posts (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  bucket text not null default '',
  storage_path text not null default '',
  sort_order integer not null default 0
);

create index if not exists activity_posts_status_published_idx
  on public.activity_posts (status, published_at desc);

create index if not exists activity_items_post_order_idx
  on public.activity_items (post_id, sort_order);

-- Ancienne publication à un seul fichier : déplacer le média, puis retirer ces colonnes.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activity_posts'
      and column_name = 'url'
  ) then
    insert into public.activity_items (post_id, kind, url, bucket, storage_path, sort_order)
    select id, kind, url, bucket, storage_path, 0
    from public.activity_posts
    where coalesce(url, '') <> ''
      and not exists (
        select 1 from public.activity_items as items where items.post_id = activity_posts.id
      );

    alter table public.activity_posts drop column if exists kind;
    alter table public.activity_posts drop column if exists url;
    alter table public.activity_posts drop column if exists alt_text;
    alter table public.activity_posts drop column if exists bucket;
    alter table public.activity_posts drop column if exists storage_path;
  end if;
end $$;

alter table public.activity_posts enable row level security;
alter table public.activity_items enable row level security;

drop policy if exists "published activity posts are public" on public.activity_posts;
create policy "published activity posts are public"
  on public.activity_posts
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "published activity items are public" on public.activity_items;
create policy "published activity items are public"
  on public.activity_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.activity_posts as posts
      where posts.id = activity_items.post_id
        and posts.status = 'published'
    )
  );
