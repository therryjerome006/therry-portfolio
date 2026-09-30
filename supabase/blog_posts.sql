-- Schéma préparé pour un futur branchement Supabase.
-- Le blog lit aujourd'hui les fichiers Markdown de content/blog.
-- Les brouillons ne doivent pas être exposés par les policies publiques.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null default '',
  cover_image text,
  category text not null,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_published_idx
  on public.blog_posts (status, published_at desc);

alter table public.blog_posts enable row level security;

drop policy if exists "published posts are public" on public.blog_posts;
create policy "published posts are public"
  on public.blog_posts
  for select
  to anon, authenticated
  using (status = 'published');

-- Bucket de stockage à créer dans Supabase : blog-images
-- Lecture publique des objets, écriture réservée au rôle authentifié propriétaire.
