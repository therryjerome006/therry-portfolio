-- Interactions sociales. Le contenu (articles, projets, réalisations, media)
-- reste là où il est déjà. Ces tables ne font que le relier.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  username text not null check (username ~ '^[a-z0-9_]{3,24}$'),
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_url text not null default '' check (avatar_url = '' or avatar_url ~ '^https://'),
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_type text not null check (content_type in ('article', 'post', 'project', 'media')),
  content_id text not null check (content_id ~ '^[A-Za-z0-9-]{1,80}$'),
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_target_idx
  on public.comments (content_type, content_id, created_at);

create table if not exists public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  content_type text not null check (content_type in ('article', 'post', 'project', 'media')),
  content_id text not null check (content_id ~ '^[A-Za-z0-9-]{1,80}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, content_type, content_id)
);

create index if not exists likes_target_idx on public.likes (content_type, content_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  content_type text check (content_type in ('article', 'post', 'project', 'media')),
  content_id text check (content_id is null or content_id ~ '^[A-Za-z0-9-]{1,80}$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create or replace function public.guard_comment()
returns trigger
language plpgsql
as $$
declare
  parent public.comments;
begin
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id
      or new.content_type <> old.content_type
      or new.content_id <> old.content_id
      or new.parent_id is distinct from old.parent_id then
      raise exception 'Commentaire non modifiable.';
    end if;
    new.updated_at = now();
  end if;

  if new.parent_id is not null then
    select * into parent from public.comments where id = new.parent_id;
    if parent.id is null then
      raise exception 'Réponse sans commentaire parent.';
    end if;
    if parent.parent_id is not null then
      raise exception 'Un seul niveau de réponse.';
    end if;
    if parent.content_type <> new.content_type or parent.content_id <> new.content_id then
      raise exception 'La réponse doit rester sur le même contenu.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists comments_guard on public.comments;
create trigger comments_guard
  before insert or update on public.comments
  for each row execute function public.guard_comment();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'Visiteur'), 40),
    'u' || substr(replace(new.id::text, '-', ''), 1, 12)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select to anon, authenticated using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "comments are public" on public.comments;
create policy "comments are public" on public.comments for select to anon, authenticated using (true);

drop policy if exists "users insert own comments" on public.comments;
create policy "users insert own comments" on public.comments for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "users update own comments" on public.comments;
create policy "users update own comments" on public.comments for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users delete own comments" on public.comments;
create policy "users delete own comments" on public.comments for delete to authenticated using (user_id = auth.uid());

drop policy if exists "likes are public" on public.likes;
create policy "likes are public" on public.likes for select to anon, authenticated using (true);

drop policy if exists "users insert own likes" on public.likes;
create policy "users insert own likes" on public.likes for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "users delete own likes" on public.likes;
create policy "users delete own likes" on public.likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());

grant select on public.profiles, public.comments, public.likes to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.comments to authenticated;
grant insert, delete on public.likes to authenticated;
grant select on public.notifications to authenticated;
