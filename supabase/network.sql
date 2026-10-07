-- Réseau TY Space. Les articles markdown, les projets, les réalisations
-- et le média du portfolio restent dans leurs tables. Ce fichier ajoute le fil.

alter table public.profiles
  add column if not exists interests text not null default '',
  add column if not exists age_band text not null default 'unknown',
  add column if not exists suspended_at timestamptz,
  add column if not exists is_admin boolean not null default false;

alter table public.profiles drop constraint if exists profiles_age_band_check;
alter table public.profiles
  add constraint profiles_age_band_check
  check (age_band in ('12-15', '16-17', '18-22', '23+', 'unknown'));

alter table public.profiles drop constraint if exists profiles_interests_check;
alter table public.profiles
  add constraint profiles_interests_check
  check (char_length(interests) <= 160);

create or replace function public.protect_profile()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.suspended_at := null;
    else
      new.is_admin := old.is_admin;
      new.suspended_at := old.suspended_at;
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before insert or update on public.profiles
  for each row execute function public.protect_profile();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  band text := coalesce(new.raw_user_meta_data->>'age_band', 'unknown');
begin
  if band not in ('12-15', '16-17', '18-22', '23+') then
    band := 'unknown';
  end if;
  insert into public.profiles (id, display_name, username, age_band)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'Visiteur'), 40),
    'u' || substr(replace(new.id::text, '-', ''), 1, 12),
    band
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 40),
  description text not null default '' check (char_length(description) <= 280),
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('text', 'photo', 'video')),
  body text not null default '' check (char_length(body) <= 500),
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  community_id uuid references public.communities (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'text' and char_length(btrim(body)) between 1 and 500)
    or kind in ('photo', 'video')
  )
);

create index if not exists posts_feed_idx on public.posts (created_at desc) where status = 'published';
create index if not exists posts_author_idx on public.posts (user_id, created_at desc);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  url text not null check (url ~ '^https://'),
  thumbnail_url text not null default '',
  file_size integer not null check (file_size > 0 and file_size <= 31457280),
  duration numeric check (duration is null or (duration > 0 and duration <= 15)),
  mime_type text not null,
  width integer,
  height integer
);

create index if not exists post_media_post_idx on public.post_media (post_id);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'article', 'photo', 'video', 'profile')),
  target_id text not null check (target_id ~ '^[A-Za-z0-9-]{1,80}$'),
  reason text not null check (reason in ('spam', 'harcelement', 'insultes', 'sexuel', 'violence', 'haine', 'arnaque', 'usurpation', 'autre')),
  note text not null default '' check (char_length(note) <= 280),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator')),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.community_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 20 and 20000),
  category text not null check (char_length(category) between 2 and 40),
  tags text[] not null default '{}',
  cover_url text not null default '' check (cover_url = '' or cover_url ~ '^https://'),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_articles_feed_idx
  on public.community_articles (created_at desc) where status = 'published';

create or replace function public.minor_contact_blocked(actor uuid, target uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_age text;
  target_age text;
begin
  if actor is null or target is null or actor = target then
    return false;
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = actor and blocked_id = target)
       or (blocker_id = target and blocked_id = actor)
  ) then
    return true;
  end if;
  select age_band into actor_age from public.profiles where id = actor;
  select age_band into target_age from public.profiles where id = target;
  if actor_age = '23+' and target_age in ('12-15', '16-17', 'unknown') then
    return true;
  end if;
  if coalesce(actor_age, 'unknown') = 'unknown' and target_age in ('12-15', '16-17') then
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.guard_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.minor_contact_blocked(new.follower_id, new.following_id) then
    raise exception 'Cette personne ne peut pas être suivie.';
  end if;
  if exists (select 1 from public.profiles where id = new.follower_id and suspended_at is not null) then
    raise exception 'Compte suspendu.';
  end if;
  insert into public.notifications (user_id, kind, content_type, content_id)
  values (new.following_id, 'follow', null, null);
  return new;
end;
$$;

drop trigger if exists follows_guard on public.follows;
create trigger follows_guard
  before insert on public.follows
  for each row execute function public.guard_follow();

create or replace function public.guard_feed_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  if new.content_type <> 'feed' then
    return new;
  end if;
  select user_id into owner from public.posts where id::text = new.content_id and status = 'published';
  if owner is null then
    raise exception 'Publication introuvable.';
  end if;
  if public.minor_contact_blocked(new.user_id, owner) then
    raise exception 'Cette interaction n''est pas autorisée.';
  end if;
  if tg_table_name = 'comments' and owner <> new.user_id then
    insert into public.notifications (user_id, kind, content_type, content_id)
    values (owner, 'comment', 'feed', new.content_id);
  end if;
  return new;
end;
$$;

drop trigger if exists comments_feed_guard on public.comments;
create trigger comments_feed_guard
  before insert on public.comments
  for each row execute function public.guard_feed_interaction();

drop trigger if exists likes_feed_guard on public.likes;
create trigger likes_feed_guard
  before insert on public.likes
  for each row execute function public.guard_feed_interaction();

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.comments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%content_type%'
  loop
    execute format('alter table public.comments drop constraint %I', constraint_name);
  end loop;
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.likes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%content_type%'
  loop
    execute format('alter table public.likes drop constraint %I', constraint_name);
  end loop;
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%content_type%'
  loop
    execute format('alter table public.notifications drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.comments
  add constraint comments_content_type_check
  check (content_type in ('article', 'post', 'project', 'media', 'feed'));

alter table public.likes
  add constraint likes_content_type_check
  check (content_type in ('article', 'post', 'project', 'media', 'feed', 'comment'));

alter table public.notifications
  add constraint notifications_content_type_check
  check (content_type is null or content_type in ('article', 'post', 'project', 'media', 'feed'));

alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.saves enable row level security;
alter table public.reports enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_articles enable row level security;

drop policy if exists "published posts are visible" on public.posts;
create policy "published posts are visible" on public.posts
  for select to anon, authenticated
  using (
    (status = 'published' or user_id = auth.uid())
    and not exists (
      select 1 from public.profiles author
      where author.id = posts.user_id
        and author.suspended_at is not null
        and (auth.uid() is null or author.id <> auth.uid())
    )
    and not public.minor_contact_blocked(auth.uid(), posts.user_id)
  );

drop policy if exists "users insert own posts" on public.posts;
create policy "users insert own posts" on public.posts
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'published'
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended_at is not null)
  );

drop policy if exists "users update own posts" on public.posts;
create policy "users update own posts" on public.posts
  for update to authenticated
  using (user_id = auth.uid() and status = 'published')
  with check (user_id = auth.uid() and status = 'published');

drop policy if exists "users delete own posts" on public.posts;
create policy "users delete own posts" on public.posts
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "visible post media" on public.post_media;
create policy "visible post media" on public.post_media
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.posts
      where posts.id = post_media.post_id
        and (posts.status = 'published' or posts.user_id = auth.uid())
    )
  );

drop policy if exists "users insert own post media" on public.post_media;
create policy "users insert own post media" on public.post_media
  for insert to authenticated
  with check (
    exists (select 1 from public.posts where posts.id = post_media.post_id and posts.user_id = auth.uid())
  );

drop policy if exists "follows are public" on public.follows;
create policy "follows are public" on public.follows for select to anon, authenticated using (true);

drop policy if exists "users insert own follows" on public.follows;
create policy "users insert own follows" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());

drop policy if exists "users delete own follows" on public.follows;
create policy "users delete own follows" on public.follows
  for delete to authenticated using (follower_id = auth.uid());

drop policy if exists "users read own blocks" on public.blocks;
create policy "users read own blocks" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "users insert own blocks" on public.blocks;
create policy "users insert own blocks" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists "users delete own blocks" on public.blocks;
create policy "users delete own blocks" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

drop policy if exists "users read own saves" on public.saves;
create policy "users read own saves" on public.saves
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "users insert own saves" on public.saves;
create policy "users insert own saves" on public.saves
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "users delete own saves" on public.saves;
create policy "users delete own saves" on public.saves
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "users insert reports" on public.reports;
create policy "users insert reports" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid() and status = 'pending');

drop policy if exists "users read own reports" on public.reports;
create policy "users read own reports" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

drop policy if exists "communities are public" on public.communities;
create policy "communities are public" on public.communities for select to anon, authenticated using (true);

drop policy if exists "members are public" on public.community_members;
create policy "members are public" on public.community_members for select to anon, authenticated using (true);

drop policy if exists "users join communities" on public.community_members;
create policy "users join communities" on public.community_members
  for insert to authenticated with check (user_id = auth.uid() and role = 'member');

drop policy if exists "users leave communities" on public.community_members;
create policy "users leave communities" on public.community_members
  for delete to authenticated using (user_id = auth.uid() and role = 'member');

drop policy if exists "published articles are visible" on public.community_articles;
create policy "published articles are visible" on public.community_articles
  for select to anon, authenticated
  using (status = 'published' or user_id = auth.uid());

drop policy if exists "users insert own articles" on public.community_articles;
create policy "users insert own articles" on public.community_articles
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'published'
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.suspended_at is not null)
  );

drop policy if exists "users update own articles" on public.community_articles;
create policy "users update own articles" on public.community_articles
  for update to authenticated
  using (user_id = auth.uid() and status = 'published')
  with check (user_id = auth.uid() and status = 'published');

drop policy if exists "users delete own articles" on public.community_articles;
create policy "users delete own articles" on public.community_articles
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.protect_notification()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    new.user_id := old.user_id;
    new.kind := old.kind;
    new.content_type := old.content_type;
    new.content_id := old.content_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_protect on public.notifications;
create trigger notifications_protect
  before update on public.notifications
  for each row execute function public.protect_notification();

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant update on public.notifications to authenticated;

grant select on public.posts, public.post_media, public.follows, public.communities, public.community_members, public.community_articles to anon, authenticated;
grant select, insert, delete on public.saves, public.blocks, public.reports to authenticated;
grant insert, update, delete on public.posts, public.post_media, public.community_articles to authenticated;
grant insert, delete on public.follows, public.community_members to authenticated;

insert into public.communities (slug, name, description)
values
  ('programmation', 'Programmation', 'Questions, projets et découvertes autour du code.'),
  ('gaming', 'Gaming', 'Jeux, parties et recommandations.'),
  ('echecs', 'Échecs', 'Parties, ouvertures et défis.'),
  ('football', 'Football', 'Matchs, clubs et terrain.'),
  ('basketball', 'Basketball', 'Panier, équipes et entraînement.'),
  ('musique', 'Musique', 'Morceaux, artistes et créations.'),
  ('art', 'Art', 'Dessin, photo et créations visuelles.'),
  ('lecture', 'Lecture', 'Livres, textes et recommandations.'),
  ('sciences', 'Sciences', 'Expériences, questions et découvertes.'),
  ('technologie', 'Technologie', 'Outils, applis et nouveautés.'),
  ('haiti', 'Haïti', 'Actualités, culture et vie en Haïti.')
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-images', 'post-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-videos', 'post-videos', true, 31457280, array['video/mp4']),
  ('article-images', 'article-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "network public read" on storage.objects;
create policy "network public read"
  on storage.objects
  for select
  to public
  using (bucket_id in ('avatars', 'post-images', 'post-videos', 'article-images'));
