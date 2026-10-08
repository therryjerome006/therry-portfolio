-- Les profils éditoriaux se suivent et s'enregistrent avec les mêmes tables que les membres.
-- following_id reste le compte personnel. editorial_id vise un profil de la plateforme.
-- Un abonnement ne peut pas viser les deux à la fois.

alter table public.follows
  add column if not exists editorial_id uuid references public.editorial_profiles (id) on delete cascade;

alter table public.follows drop constraint if exists follows_pkey;
alter table public.follows alter column following_id drop not null;

alter table public.follows drop constraint if exists follows_target_check;
alter table public.follows
  add constraint follows_target_check check (
    (following_id is not null and editorial_id is null)
    or (following_id is null and editorial_id is not null)
  );

create unique index if not exists follows_member_idx
  on public.follows (follower_id, following_id)
  where following_id is not null;

create unique index if not exists follows_editorial_idx
  on public.follows (follower_id, editorial_id)
  where editorial_id is not null;

create index if not exists follows_editorial_target_idx
  on public.follows (editorial_id)
  where editorial_id is not null;

alter table public.saves
  add column if not exists editorial_item_id uuid references public.editorial_items (id) on delete cascade;

alter table public.saves drop constraint if exists saves_pkey;
alter table public.saves alter column post_id drop not null;

alter table public.saves drop constraint if exists saves_target_check;
alter table public.saves
  add constraint saves_target_check check (
    (post_id is not null and editorial_item_id is null)
    or (post_id is null and editorial_item_id is not null)
  );

create unique index if not exists saves_post_idx
  on public.saves (user_id, post_id)
  where post_id is not null;

create unique index if not exists saves_editorial_idx
  on public.saves (user_id, editorial_item_id)
  where editorial_item_id is not null;

alter table public.editorial_items drop constraint if exists editorial_items_status_check;

alter table public.editorial_items
  add constraint editorial_items_status_check
  check (status in ('draft', 'scheduled', 'published', 'failed', 'archived', 'hidden'));

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.reports'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%target_type%'
  loop
    execute format('alter table public.reports drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.reports
  add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'article', 'photo', 'video', 'profile', 'group', 'editorial'));

create or replace function public.guard_follow()
returns trigger
language plpgsql
as $$
begin
  if new.following_id is not null and new.editorial_id is not null then
    raise exception 'Un abonnement ne peut viser qu''une seule identité.';
  end if;
  if new.following_id is null and new.editorial_id is null then
    raise exception 'Abonnement incomplet.';
  end if;
  if new.following_id is not null and new.follower_id = new.following_id then
    raise exception 'Vous ne pouvez pas vous suivre.';
  end if;
  if new.editorial_id is not null and not exists (
    select 1 from public.editorial_profiles
    where id = new.editorial_id and archived_at is null
  ) then
    raise exception 'Ce profil éditorial ne peut pas être suivi.';
  end if;
  return new;
end;
$$;

drop trigger if exists follows_guard on public.follows;
create trigger follows_guard
  before insert or update on public.follows
  for each row execute function public.guard_follow();

create or replace function public.guard_save()
returns trigger
language plpgsql
as $$
begin
  if new.post_id is not null and new.editorial_item_id is not null then
    raise exception 'Un enregistrement ne peut viser qu''une publication.';
  end if;
  if new.post_id is null and new.editorial_item_id is null then
    raise exception 'Publication inconnue.';
  end if;
  if new.editorial_item_id is not null and not exists (
    select 1 from public.editorial_items
    where id = new.editorial_item_id
      and status = 'published'
      and published_at is not null
      and published_at <= now()
  ) then
    raise exception 'Cette publication ne peut pas être enregistrée.';
  end if;
  return new;
end;
$$;

drop trigger if exists saves_guard on public.saves;
create trigger saves_guard
  before insert or update on public.saves
  for each row execute function public.guard_save();

notify pgrst, 'reload schema';
