-- Une école représentant un établissement n'est créée qu'après accord
-- d'un administrateur. Le demandeur en devient le gérant principal.

alter table public.school_members
  add column if not exists role text not null default 'member';

alter table public.school_members drop constraint if exists school_members_role_check;
alter table public.school_members
  add constraint school_members_role_check
  check (role in ('member', 'manager'));

create table if not exists public.school_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.community_groups (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  note text not null default '' check (char_length(note) <= 160),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  school_id uuid references public.schools (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists school_requests_pending_name_idx
  on public.school_requests (group_id, lower(name))
  where status = 'pending';

create unique index if not exists school_requests_one_pending_user_idx
  on public.school_requests (user_id, group_id)
  where status = 'pending';

create or replace function public.guard_school_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_age text;
begin
  if auth.uid() is not null then
    new.role := 'member';
  end if;
  select age_band into member_age from public.profiles where id = new.user_id;
  if member_age not in ('12-15', '16-17', '18-22') then
    raise exception 'Les groupes d''écoles sont réservés aux 12 à 22 ans.';
  end if;
  return new;
end;
$$;

create or replace function public.guard_school_member_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'manager' and auth.uid() is not null then
    raise exception 'Le gérant principal reste responsable de l''établissement.';
  end if;
  return old;
end;
$$;

drop trigger if exists school_members_keep_manager on public.school_members;
create trigger school_members_keep_manager
  before delete on public.school_members
  for each row execute function public.guard_school_member_delete();

create or replace function public.guard_school_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_age text;
begin
  if tg_op = 'UPDATE' and auth.uid() is not null then
    raise exception 'Cette demande ne peut pas être modifiée.';
  end if;
  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.user_id <> auth.uid() then
      raise exception 'Demande invalide.';
    end if;
    new.status := 'pending';
    new.reviewed_at := null;
    new.school_id := null;
    if public.contains_explicit(new.name) or public.contains_explicit(new.note) then
      raise exception 'Ce nom n''est pas autorisé.';
    end if;
    if not exists (
      select 1 from public.community_groups
      where id = new.group_id and kind = 'schools'
    ) then
      raise exception 'Groupe inconnu.';
    end if;
    select age_band into member_age from public.profiles where id = new.user_id;
    if member_age not in ('12-15', '16-17', '18-22') then
      raise exception 'Les groupes d''écoles sont réservés aux 12 à 22 ans.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists school_requests_guard on public.school_requests;
create trigger school_requests_guard
  before insert or update on public.school_requests
  for each row execute function public.guard_school_request();

alter table public.school_requests enable row level security;

drop policy if exists "users read own school requests" on public.school_requests;
create policy "users read own school requests" on public.school_requests
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users send school requests" on public.school_requests;
create policy "users send school requests" on public.school_requests
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "users add schools" on public.schools;
revoke insert on public.schools from authenticated, anon;

grant select, insert on public.school_requests to authenticated;

notify pgrst, 'reload schema';
