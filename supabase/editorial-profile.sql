-- Personnalisation des présentateurs éditoriaux.
-- Ce ne sont toujours pas des comptes Auth.

alter table public.editorial_profiles
  add column if not exists website text not null default '';

alter table public.editorial_profiles drop constraint if exists editorial_profiles_website_check;
alter table public.editorial_profiles
  add constraint editorial_profiles_website_check
  check (website = '' or (char_length(website) <= 120 and website ~ '^https://[^[:space:]]+$'));

create table if not exists public.editorial_slugs (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  profile_id uuid not null references public.editorial_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.editorial_slugs enable row level security;

drop policy if exists "editorial slugs are public" on public.editorial_slugs;
create policy "editorial slugs are public"
  on public.editorial_slugs
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.editorial_slugs from anon, authenticated, public;
grant select on public.editorial_slugs to anon, authenticated;

create or replace function public.guard_editorial_slug()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.editorial_profiles
    where id = new.profile_id and slug = new.slug
  ) then
    raise exception 'Ancien identifiant éditorial invalide.';
  end if;
  return new;
end;
$$;

drop trigger if exists editorial_slugs_guard on public.editorial_slugs;
create trigger editorial_slugs_guard
  before insert on public.editorial_slugs
  for each row execute function public.guard_editorial_slug();

notify pgrst, 'reload schema';
