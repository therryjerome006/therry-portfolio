-- Groupes de membres : créés et administrés sans demande.
-- Les écoles (kind = schools) restent soumises à l'accord d'un administrateur.

alter table public.community_groups drop constraint if exists community_groups_kind_check;
alter table public.community_groups
  add constraint community_groups_kind_check
  check (kind in ('schools', 'member'));

alter table public.community_groups
  add column if not exists owner_id uuid references public.profiles (id) on delete set null;

alter table public.community_groups
  add column if not exists status text not null default 'open';

alter table public.community_groups drop constraint if exists community_groups_status_check;
alter table public.community_groups
  add constraint community_groups_status_check
  check (status in ('open', 'closed'));

alter table public.community_groups
  add column if not exists warning text not null default '';

alter table public.community_groups drop constraint if exists community_groups_warning_check;
alter table public.community_groups
  add constraint community_groups_warning_check
  check (char_length(warning) <= 280);

alter table public.community_groups
  add column if not exists flagged boolean not null default false;

create unique index if not exists member_groups_open_name_idx
  on public.community_groups (community_id, lower(name))
  where kind = 'member' and status = 'open';

create table if not exists public.group_members (
  group_id uuid not null references public.community_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create or replace function public.is_group_admin(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.guard_member_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and auth.uid() is not null then
    if new.kind is distinct from 'member' then
      raise exception 'Seuls les groupes de membres se créent ici.';
    end if;
    if public.contains_explicit(new.name) then
      raise exception 'Ce nom n''est pas autorisé.';
    end if;
    if lower(new.name) in ('écoles', 'ecoles') or new.slug = 'ecoles' then
      raise exception 'Ce nom est réservé.';
    end if;
    new.owner_id := auth.uid();
    new.status := 'open';
    new.warning := '';
    new.flagged := false;
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null then
    new.community_id := old.community_id;
    new.slug := old.slug;
    new.name := old.name;
    new.kind := old.kind;
    new.owner_id := old.owner_id;
    new.status := old.status;
    new.warning := old.warning;
    new.flagged := old.flagged;
  end if;
  return new;
end;
$$;

drop trigger if exists community_groups_guard on public.community_groups;
create trigger community_groups_guard
  before insert or update on public.community_groups
  for each row execute function public.guard_member_group();

create or replace function public.add_group_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'member' and new.owner_id is not null then
    insert into public.group_members (group_id, user_id, role)
    values (new.id, new.owner_id, 'admin')
    on conflict (group_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists community_groups_owner on public.community_groups;
create trigger community_groups_owner
  after insert on public.community_groups
  for each row execute function public.add_group_owner();

create or replace function public.guard_group_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grp public.community_groups;
begin
  select * into grp from public.community_groups where id = new.group_id;
  if grp.id is null or grp.kind is distinct from 'member' or grp.status <> 'open' then
    raise exception 'Ce groupe n''accepte pas de nouveaux membres.';
  end if;
  if auth.uid() is not null then
    if new.user_id <> auth.uid() then
      raise exception 'Inscription invalide.';
    end if;
    new.role := case when grp.owner_id = auth.uid() then 'admin' else 'member' end;
  end if;
  return new;
end;
$$;

drop trigger if exists group_members_guard on public.group_members;
create trigger group_members_guard
  before insert on public.group_members
  for each row execute function public.guard_group_member();

create or replace function public.guard_group_member_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'admin' and auth.uid() is not null then
    raise exception 'L''administrateur du groupe reste responsable.';
  end if;
  return old;
end;
$$;

drop trigger if exists group_members_keep_admin on public.group_members;
create trigger group_members_keep_admin
  before delete on public.group_members
  for each row execute function public.guard_group_member_delete();

alter table public.group_members enable row level security;

drop policy if exists "group members are public" on public.group_members;
create policy "group members are public" on public.group_members
  for select to anon, authenticated using (true);

drop policy if exists "users join member groups" on public.group_members;
create policy "users join member groups" on public.group_members
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users leave or admins remove" on public.group_members;
create policy "users leave or admins remove" on public.group_members
  for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists "users create member groups" on public.community_groups;
create policy "users create member groups" on public.community_groups
  for insert to authenticated
  with check (
    kind = 'member'
    and owner_id = auth.uid()
    and status = 'open'
    and warning = ''
    and flagged = false
  );

grant select on public.group_members to anon, authenticated;
grant insert, delete on public.group_members to authenticated;
grant insert on public.community_groups to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;

alter table public.notifications
  add column if not exists note text not null default '';

alter table public.notifications drop constraint if exists notifications_note_check;
alter table public.notifications
  add constraint notifications_note_check
  check (char_length(note) <= 280);

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
    new.note := old.note;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%target_type%'
  loop
    execute format('alter table public.reports drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.reports
  add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'article', 'photo', 'video', 'profile', 'group'));

notify pgrst, 'reload schema';
