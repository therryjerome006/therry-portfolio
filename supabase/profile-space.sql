-- Espace personnel. Les relations restent liées à l'identifiant du compte,
-- pas au nom d'utilisateur. Les anciens noms restent résolus.

alter table public.profiles
  add column if not exists website text not null default '';

alter table public.profiles drop constraint if exists profiles_website_check;
alter table public.profiles
  add constraint profiles_website_check
  check (website = '' or (char_length(website) <= 120 and website ~ '^https://[^[:space:]]+$'));

alter table public.profiles
  add column if not exists show_relations boolean not null default true;

create table if not exists public.profile_names (
  username text primary key check (username ~ '^[a-z0-9_]{3,24}$'),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists profile_names_profile_idx on public.profile_names (profile_id);

alter table public.profile_names enable row level security;

drop policy if exists "profile names are public" on public.profile_names;
create policy "profile names are public"
  on public.profile_names
  for select
  to anon, authenticated
  using (true);

drop policy if exists "users keep their previous name" on public.profile_names;
create policy "users keep their previous name"
  on public.profile_names
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "users undo an unfinished name change" on public.profile_names;
create policy "users undo an unfinished name change"
  on public.profile_names
  for delete
  to authenticated
  using (
    profile_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.username = profile_names.username
    )
  );

grant select on public.profile_names to anon, authenticated;
grant insert, delete on public.profile_names to authenticated;

create or replace function public.guard_profile_name()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and new.profile_id is distinct from auth.uid() then
    raise exception 'Nom d''utilisateur non autorisé.';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = new.profile_id and username = new.username
  ) then
    raise exception 'Ancien identifiant invalide.';
  end if;
  return new;
end;
$$;

drop trigger if exists profile_names_guard on public.profile_names;
create trigger profile_names_guard
  before insert on public.profile_names
  for each row execute function public.guard_profile_name();

create or replace function public.profile_relation_count(person uuid, kind text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when kind = 'followers' then (select count(*)::int from public.follows where following_id = person)
    when kind = 'following' then (select count(*)::int from public.follows where follower_id = person and following_id is not null)
    else 0
  end;
$$;

revoke all on function public.profile_relation_count(uuid, text) from public, anon, authenticated;
grant execute on function public.profile_relation_count(uuid, text) to anon, authenticated;

drop policy if exists "follows are public" on public.follows;
drop policy if exists "follows are visible" on public.follows;
create policy "follows are visible"
  on public.follows
  for select
  to anon, authenticated
  using (
    follower_id = auth.uid()
    or following_id = auth.uid()
    or editorial_id is not null
    or (
      following_id is not null
      and exists (select 1 from public.profiles person where person.id = follows.follower_id and person.show_relations)
      and exists (select 1 from public.profiles person where person.id = follows.following_id and person.show_relations)
    )
  );

notify pgrst, 'reload schema';
