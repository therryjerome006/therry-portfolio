-- Groupes d'écoles dans les communautés, public d'une publication,
-- et refus des contenus explicites.

create or replace function public.contains_explicit(input text)
returns boolean
language plpgsql
immutable
as $$
declare
  normalized text;
begin
  if input is null or btrim(input) = '' then
    return false;
  end if;
  normalized := translate(lower(input), 'àâäéèêëïîôùûüçœæ', 'aaaeeeeiioouuucoeae');
  return normalized ~ '(^|[^a-z0-9])(pornographie|pornographique|porno|porn|onlyfans|nudes|nude|sexuelle|sexuel|sexuels|sexy|erotique|erotisme|penis|vagin|vulve|masturbation|masturber|orgasme|fellation|sperme|ejaculation|ejaculer|niquer|nique|niques|baiser|baise|baises|chatte|chattes|couille|couilles|sextape|xxx|sexe|plan cul|sex tape|toute nue|tout nu|seins nus)([^a-z0-9]|$)';
end;
$$;

create or replace function public.assert_audience(author uuid, audience text[])
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  author_age text;
  band text;
begin
  if audience is null or cardinality(audience) < 1 then
    raise exception 'Choisissez au moins une tranche d''âge.';
  end if;
  select age_band into author_age from public.profiles where id = author;
  if author_age is null then
    author_age := 'unknown';
  end if;
  foreach band in array audience loop
    if band not in ('12-15', '16-17', '18-22', '23+') then
      raise exception 'Cette tranche d''âge ne peut pas être choisie.';
    end if;
    if author_age in ('12-15', '16-17') and band = '23+' then
      raise exception 'Cette tranche d''âge ne peut pas être choisie.';
    end if;
    if author_age in ('23+', 'unknown') and band in ('12-15', '16-17') then
      raise exception 'Cette tranche d''âge ne peut pas être choisie.';
    end if;
  end loop;
end;
$$;

create or replace function public.audience_visible(audience text[], author uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  viewer_age text;
begin
  if auth.uid() is not null and auth.uid() = author then
    return true;
  end if;
  if audience is null then
    return false;
  end if;
  if auth.uid() is null then
    return audience @> array['12-15', '16-17', '18-22']::text[];
  end if;
  select age_band into viewer_age from public.profiles where id = auth.uid();
  if viewer_age is null or viewer_age = 'unknown' then
    return audience && array['18-22', '23+']::text[]
      and not (audience && array['12-15', '16-17']::text[]);
  end if;
  return viewer_age = any (audience);
end;
$$;

alter table public.posts
  add column if not exists audience text[] not null default array['12-15', '16-17', '18-22', '23+']::text[],
  add column if not exists school_id uuid;

alter table public.posts drop constraint if exists posts_audience_check;
alter table public.posts
  add constraint posts_audience_check
  check (
    cardinality(audience) >= 1
    and audience <@ array['12-15', '16-17', '18-22', '23+']::text[]
  );

alter table public.community_articles
  add column if not exists audience text[] not null default array['12-15', '16-17', '18-22', '23+']::text[];

alter table public.community_articles drop constraint if exists community_articles_audience_check;
alter table public.community_articles
  add constraint community_articles_audience_check
  check (
    cardinality(audience) >= 1
    and audience <@ array['12-15', '16-17', '18-22', '23+']::text[]
  );

create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 40),
  kind text not null check (kind in ('schools')),
  created_at timestamptz not null default now(),
  unique (community_id, slug)
);

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  created_at timestamptz not null default now()
);

create unique index if not exists schools_group_name_idx on public.schools (group_id, lower(name));

create table if not exists public.school_members (
  user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, school_id)
);

alter table public.posts drop constraint if exists posts_school_id_fkey;
alter table public.posts
  add constraint posts_school_id_fkey
  foreign key (school_id) references public.schools (id) on delete set null;

create or replace function public.guard_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or new.body is distinct from old.body) and public.contains_explicit(new.body) then
    raise exception 'Les contenus pour adultes et les messages trop explicites ne sont pas autorisés.';
  end if;
  if tg_op = 'INSERT' or new.audience is distinct from old.audience then
    perform public.assert_audience(new.user_id, new.audience);
  end if;
  if new.school_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.school_id is not distinct from old.school_id and new.community_id is not distinct from old.community_id then
    return new;
  end if;
  if new.community_id is null or not exists (
    select 1
    from public.school_members member
    join public.schools school on school.id = member.school_id
    join public.community_groups grp on grp.id = school.group_id
    where member.user_id = new.user_id
      and member.school_id = new.school_id
      and grp.community_id = new.community_id
      and grp.kind = 'schools'
  ) then
    raise exception 'L''insigne de l''école ne peut pas être utilisé ici.';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_guard on public.posts;
create trigger posts_guard
  before insert or update on public.posts
  for each row execute function public.guard_post();

create or replace function public.guard_article()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' or new.title is distinct from old.title or new.body is distinct from old.body)
     and (public.contains_explicit(new.title) or public.contains_explicit(new.body)) then
    raise exception 'Les contenus pour adultes et les messages trop explicites ne sont pas autorisés.';
  end if;
  if tg_op = 'INSERT' or new.audience is distinct from old.audience then
    perform public.assert_audience(new.user_id, new.audience);
  end if;
  return new;
end;
$$;

drop trigger if exists articles_guard on public.community_articles;
create trigger articles_guard
  before insert or update on public.community_articles
  for each row execute function public.guard_article();

create or replace function public.guard_school()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.contains_explicit(new.name) then
    raise exception 'Ce nom n''est pas autorisé.';
  end if;
  return new;
end;
$$;

drop trigger if exists schools_guard on public.schools;
create trigger schools_guard
  before insert or update on public.schools
  for each row execute function public.guard_school();

create or replace function public.guard_school_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_age text;
begin
  select age_band into member_age from public.profiles where id = new.user_id;
  if member_age not in ('12-15', '16-17', '18-22') then
    raise exception 'Les groupes d''écoles sont réservés aux 12 à 22 ans.';
  end if;
  return new;
end;
$$;

drop trigger if exists school_members_guard on public.school_members;
create trigger school_members_guard
  before insert on public.school_members
  for each row execute function public.guard_school_member();

create or replace function public.guard_feed_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  post_audience text[];
begin
  if new.content_type = 'feed' then
    select user_id, audience into owner, post_audience
    from public.posts
    where id::text = new.content_id and status = 'published';
    if owner is null then
      raise exception 'Publication introuvable.';
    end if;
  elsif new.content_type = 'article' and new.content_id ~ '^[0-9a-f-]{36}$' then
    select user_id, audience into owner, post_audience
    from public.community_articles
    where id::text = new.content_id and status = 'published';
    if owner is null then
      raise exception 'Article introuvable.';
    end if;
  else
    return new;
  end if;
  if not public.audience_visible(post_audience, owner) or public.minor_contact_blocked(new.user_id, owner) then
    raise exception 'Cette interaction n''est pas autorisée.';
  end if;
  if tg_table_name = 'comments' and owner <> new.user_id then
    insert into public.notifications (user_id, kind, content_type, content_id)
    values (owner, 'comment', new.content_type, new.content_id);
  end if;
  return new;
end;
$$;

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
    and public.audience_visible(posts.audience, posts.user_id)
  );

drop policy if exists "published articles are visible" on public.community_articles;
create policy "published articles are visible" on public.community_articles
  for select to anon, authenticated
  using (
    (status = 'published' or user_id = auth.uid())
    and public.audience_visible(community_articles.audience, community_articles.user_id)
  );

alter table public.community_groups enable row level security;
alter table public.schools enable row level security;
alter table public.school_members enable row level security;

drop policy if exists "groups are public" on public.community_groups;
create policy "groups are public" on public.community_groups
  for select to anon, authenticated using (true);

drop policy if exists "schools are public" on public.schools;
create policy "schools are public" on public.schools
  for select to anon, authenticated using (true);

drop policy if exists "users add schools" on public.schools;
create policy "users add schools" on public.schools
  for insert to authenticated
  with check (
    char_length(btrim(name)) between 2 and 80
    and exists (
      select 1 from public.community_groups grp
      where grp.id = group_id and grp.kind = 'schools'
    )
  );

drop policy if exists "school members are public" on public.school_members;
create policy "school members are public" on public.school_members
  for select to anon, authenticated using (true);

drop policy if exists "users join schools" on public.school_members;
create policy "users join schools" on public.school_members
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users leave schools" on public.school_members;
create policy "users leave schools" on public.school_members
  for delete to authenticated
  using (user_id = auth.uid());

grant select on public.community_groups, public.schools, public.school_members to anon, authenticated;
grant insert on public.schools, public.school_members to authenticated;
grant delete on public.school_members to authenticated;

insert into public.community_groups (community_id, slug, name, kind)
select id, 'ecoles', 'Écoles', 'schools'
from public.communities
on conflict (community_id, slug) do nothing;

notify pgrst, 'reload schema';
