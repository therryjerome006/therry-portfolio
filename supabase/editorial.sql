-- Studio éditorial. Les profils ne sont pas des comptes Auth.
-- Les publications personnelles restent dans public.posts, avec leur auteur réel.

create table if not exists public.editorial_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  avatar_url text not null default '' check (avatar_url = '' or avatar_url ~ '^https://'),
  description text not null default '' check (char_length(description) <= 280),
  category text not null check (category in ('officiel', 'tech', 'culture', 'sport', 'campus', 'creativite')),
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.editorial_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.editorial_profiles (id) on delete restrict,
  kind text not null check (kind in ('text', 'photo', 'video', 'article')),
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 20000),
  discussion text not null default '' check (char_length(discussion) <= 200),
  category text not null default '' check (char_length(category) <= 40),
  language text not null default 'fr' check (language in ('fr', 'ht', 'en')),
  source text not null default 'human' check (source in ('human', 'ai')),
  note text not null default '' check (char_length(note) <= 280),
  cover_url text not null default '' check (cover_url = '' or cover_url ~ '^https://'),
  media_url text not null default '' check (media_url = '' or media_url ~ '^https://'),
  media_type text check (media_type is null or media_type in ('image', 'video')),
  mime_type text not null default '',
  file_size integer check (file_size is null or (file_size > 0 and file_size <= 31457280)),
  duration numeric check (duration is null or (duration > 0 and duration <= 15)),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed', 'archived')),
  scheduled_at timestamptz,
  published_at timestamptz,
  error text not null default '' check (char_length(error) <= 280),
  publish_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'text' or char_length(body) <= 500),
  check (kind not in ('photo', 'video') or char_length(body) <= 500),
  check (status <> 'scheduled' or scheduled_at is not null),
  check (status <> 'published' or published_at is not null)
);

create index if not exists editorial_items_status_idx
  on public.editorial_items (status, scheduled_at);

create index if not exists editorial_items_published_idx
  on public.editorial_items (published_at desc)
  where status = 'published';

create index if not exists editorial_items_profile_idx
  on public.editorial_items (profile_id, created_at desc);

create table if not exists public.editorial_settings (
  id integer primary key default 1 check (id = 1),
  paused boolean not null default false,
  max_per_day integer not null default 6 check (max_per_day between 1 and 24),
  min_interval_minutes integer not null default 60 check (min_interval_minutes between 15 and 720),
  timezone text not null default 'America/Port-au-Prince',
  updated_at timestamptz not null default now()
);

insert into public.editorial_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.editorial_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.editorial_items (id) on delete set null,
  profile_id uuid references public.editorial_profiles (id) on delete set null,
  action text not null check (char_length(action) between 1 and 40),
  detail text not null default '' check (char_length(detail) <= 280),
  created_at timestamptz not null default now()
);

create index if not exists editorial_events_created_idx
  on public.editorial_events (created_at desc);

create or replace function public.guard_editorial_write()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null or current_user in ('anon', 'authenticated', 'authenticator') then
    raise exception 'Seul l''administration peut modifier le contenu éditorial.';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists editorial_profiles_guard on public.editorial_profiles;
create trigger editorial_profiles_guard
  before insert or update on public.editorial_profiles
  for each row execute function public.guard_editorial_write();

drop trigger if exists editorial_items_guard on public.editorial_items;
create trigger editorial_items_guard
  before insert or update on public.editorial_items
  for each row execute function public.guard_editorial_write();

create or replace function public.editorial_release(target uuid default null)
returns table (item_id uuid, outcome text, detail text)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.editorial_items;
  paused boolean;
  reason text;
  updated_id uuid;
begin
  select s.paused into paused from public.editorial_settings s where s.id = 1;
  if target is null and coalesce(paused, false) then
    item_id := null;
    outcome := 'paused';
    detail := 'Les programmations sont suspendues.';
    return next;
    return;
  end if;

  for rec in
    select * from public.editorial_items i
    where (
      target is null
      and i.status = 'scheduled'
      and i.scheduled_at is not null
      and i.scheduled_at <= now()
    ) or (
      target is not null
      and i.id = target
      and i.status in ('draft', 'scheduled', 'failed')
    )
    order by i.scheduled_at nulls last, i.created_at
    for update skip locked
  loop
    begin
      reason := null;
      if not exists (
        select 1 from public.editorial_profiles p
        where p.id = rec.profile_id and p.is_active and p.archived_at is null
      ) then
        reason := 'Le profil éditorial est inactif ou archivé.';
      elsif rec.kind = 'text' and char_length(btrim(rec.body)) not between 1 and 500 then
        reason := 'Le texte doit contenir entre 1 et 500 caractères.';
      elsif rec.kind = 'photo' and (rec.media_url = '' or rec.media_type is distinct from 'image') then
        reason := 'La photo est manquante.';
      elsif rec.kind = 'video' and (rec.media_url = '' or rec.media_type is distinct from 'video') then
        reason := 'La vidéo est manquante.';
      elsif rec.kind = 'article' and (char_length(btrim(rec.title)) < 3 or char_length(btrim(rec.body)) < 20) then
        reason := 'Un article publié a besoin d''un titre et d''un texte.';
      elsif public.contains_explicit(coalesce(rec.title, '') || ' ' || rec.body || ' ' || rec.discussion) then
        reason := 'Le contenu explicite n''est pas autorisé.';
      end if;

      if reason is not null then
        update public.editorial_items
        set status = 'failed',
            error = reason,
            publish_attempts = publish_attempts + 1,
            updated_at = now()
        where id = rec.id and status = rec.status;
        insert into public.editorial_events (item_id, profile_id, action, detail)
        values (rec.id, rec.profile_id, 'failed', reason);
        item_id := rec.id;
        outcome := 'failed';
        detail := reason;
        return next;
        continue;
      end if;

      updated_id := null;
      update public.editorial_items
      set status = 'published',
          published_at = now(),
          error = '',
          publish_attempts = publish_attempts + 1,
          updated_at = now()
      where id = rec.id and status = rec.status
      returning id into updated_id;

      if updated_id is null then
        item_id := rec.id;
        outcome := 'skipped';
        detail := 'Déjà traité.';
        return next;
        continue;
      end if;

      insert into public.editorial_events (item_id, profile_id, action, detail)
      values (rec.id, rec.profile_id, 'published', '');
      item_id := rec.id;
      outcome := 'published';
      detail := '';
      return next;
    exception when others then
      update public.editorial_items
      set status = 'failed',
          error = left(sqlerrm, 280),
          publish_attempts = publish_attempts + 1,
          updated_at = now()
      where id = rec.id and status in ('draft', 'scheduled', 'failed');
      insert into public.editorial_events (item_id, profile_id, action, detail)
      values (rec.id, rec.profile_id, 'failed', left(sqlerrm, 280));
      item_id := rec.id;
      outcome := 'failed';
      detail := left(sqlerrm, 280);
      return next;
    end;
  end loop;
end;
$$;

revoke all on function public.editorial_release(uuid) from public, anon, authenticated;

alter table public.editorial_profiles enable row level security;
alter table public.editorial_items enable row level security;
alter table public.editorial_settings enable row level security;
alter table public.editorial_events enable row level security;

drop policy if exists "active editorial profiles are public" on public.editorial_profiles;
create policy "active editorial profiles are public"
  on public.editorial_profiles
  for select
  to anon, authenticated
  using (archived_at is null);

drop policy if exists "published editorial items are public" on public.editorial_items;
create policy "published editorial items are public"
  on public.editorial_items
  for select
  to anon, authenticated
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
    and exists (
      select 1 from public.editorial_profiles p
      where p.id = editorial_items.profile_id
        and p.archived_at is null
    )
  );

revoke insert, update, delete on public.editorial_profiles from anon, authenticated, public;
revoke insert, update, delete on public.editorial_items from anon, authenticated, public;
revoke all on public.editorial_settings from anon, authenticated, public;
revoke all on public.editorial_events from anon, authenticated, public;

grant select on public.editorial_profiles, public.editorial_items to anon, authenticated;

insert into public.editorial_profiles (name, slug, description, category)
values
  ('TY Space Officiel', 'officiel', 'Annonces, nouveautés et informations de la plateforme.', 'officiel'),
  ('TY Space Tech', 'tech', 'Informatique, programmation et innovation.', 'tech'),
  ('TY Space Culture', 'culture', 'Culture haïtienne, musique, cinéma et découvertes.', 'culture'),
  ('TY Space Arena', 'arena', 'Sport, jeux vidéo et compétitions.', 'sport'),
  ('TY Space Campus', 'campus', 'Études, orientation et apprentissage.', 'campus'),
  ('TY Space Créativité', 'creativite', 'Art, photographie, écriture et projets créatifs.', 'creativite')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
