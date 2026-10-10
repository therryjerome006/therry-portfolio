-- Marketplace Talents: catégories hiérarchiques, formules, favoris. Aucun paiement.

alter table public.talent_categories
  add column if not exists parent_id uuid references public.talent_categories (id),
  add column if not exists icon text not null default '' check (char_length(icon) <= 40);

create index if not exists talent_categories_parent_idx on public.talent_categories (parent_id, sort_order);

create or replace function public.guard_talent_category()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'categorie';
    end if;
    if exists (select 1 from public.talent_categories where id = new.parent_id and parent_id is not null) then
      raise exception 'niveau';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists talent_categories_guard on public.talent_categories;
create trigger talent_categories_guard before insert or update on public.talent_categories
for each row execute function public.guard_talent_category();

insert into public.talent_categories (slug, name, description, sort_order, icon)
values
  ('graphisme', 'Graphisme et design', 'Logos, visuels et interfaces.', 1, 'palette'),
  ('programmation', 'Programmation et technologie', 'Sites, applications et outils.', 2, 'code'),
  ('marketing-digital', 'Marketing numérique', 'Contenu, réseaux et visibilité.', 3, 'megaphone'),
  ('video-anim', 'Vidéo et animation', 'Montage, motion et vidéos courtes.', 4, 'clapperboard'),
  ('ecriture', 'Rédaction et traduction', 'Textes, correction et langues.', 5, 'pen'),
  ('audio', 'Musique et audio', 'Musique, voix et podcasts.', 6, 'music'),
  ('business', 'Business et assistance', 'Organisation et assistance.', 7, 'briefcase'),
  ('formation', 'Formation et tutorat', 'Cours et soutien autorisés.', 8, 'graduation'),
  ('photo-evenement', 'Photographie et événements', 'Photos et couvertures.', 9, 'camera'),
  ('services-locaux', 'Artisanat et services locaux', 'Créations et services de proximité.', 10, 'hammer')
on conflict (slug) do update
set name = excluded.name, description = excluded.description, icon = excluded.icon, sort_order = excluded.sort_order;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'graphisme' and child.slug in ('design', 'illustration') and child.parent_id is null;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'programmation' and child.slug in ('web', 'informatique') and child.parent_id is null;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'marketing-digital' and child.slug in ('marketing', 'contenu') and child.parent_id is null;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'video-anim' and child.slug = 'video' and child.parent_id is null;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'ecriture' and child.slug in ('redaction', 'traduction') and child.parent_id is null;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'audio' and child.slug = 'musique' and child.parent_id is null;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'formation' and child.slug = 'education' and child.parent_id is null;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'photo-evenement' and child.slug = 'photo' and child.parent_id is null;

update public.talent_categories child
set parent_id = parent.id
from public.talent_categories parent
where parent.slug = 'services-locaux' and child.slug = 'artisanat' and child.parent_id is null;

insert into public.talent_categories (slug, name, description, sort_order, parent_id)
select item.slug, item.name, '', item.sort_order, parent.id
from (
  values
    ('graphisme', 'logos', 'Création de logos', 1),
    ('graphisme', 'identite', 'Identité visuelle', 2),
    ('graphisme', 'affiches', 'Affiches et flyers', 3),
    ('graphisme', 'ui-ux', 'Design UI/UX', 4),
    ('graphisme', 'presentations', 'Présentations', 5),
    ('graphisme', 'retouche', 'Retouche photo', 6),
    ('graphisme', 'reseaux', 'Design pour réseaux sociaux', 7),
    ('graphisme', 'packaging', 'Packaging', 8),
    ('programmation', 'sites-web', 'Développement de sites web', 1),
    ('programmation', 'ecommerce', 'Sites e-commerce', 2),
    ('programmation', 'applis-web', 'Applications web', 3),
    ('programmation', 'applis-mobiles', 'Applications mobiles', 4),
    ('programmation', 'logiciel', 'Développement logiciel', 5),
    ('programmation', 'full-stack', 'Développement Full Stack', 6),
    ('programmation', 'api', 'API et intégrations', 7),
    ('programmation', 'bases-donnees', 'Bases de données', 8),
    ('programmation', 'automatisation', 'Automatisation', 9),
    ('programmation', 'ia', 'Intelligence artificielle', 10),
    ('programmation', 'chatbots', 'Chatbots et agents IA', 11),
    ('programmation', 'cybersecurite', 'Cybersécurité', 12),
    ('programmation', 'cloud', 'Cloud et DevOps', 13),
    ('programmation', 'jeux', 'Développement de jeux vidéo', 14),
    ('programmation', 'maintenance', 'Maintenance et correction de bugs', 15),
    ('programmation', 'cms', 'WordPress et CMS', 16),
    ('marketing-digital', 'reseaux-sociaux', 'Gestion des réseaux sociaux', 1),
    ('marketing-digital', 'contenu-marketing', 'Création de contenu', 2),
    ('marketing-digital', 'publicite', 'Publicité numérique', 3),
    ('marketing-digital', 'seo', 'SEO', 4),
    ('marketing-digital', 'strategie', 'Stratégie marketing', 5),
    ('marketing-digital', 'emailing', 'Email marketing', 6),
    ('marketing-digital', 'branding', 'Branding', 7),
    ('marketing-digital', 'analyse', 'Analyse de performance', 8),
    ('video-anim', 'montage', 'Montage vidéo', 1),
    ('video-anim', 'animation-2d', 'Animation 2D', 2),
    ('video-anim', 'animation-3d', 'Animation 3D', 3),
    ('video-anim', 'motion', 'Motion design', 4),
    ('video-anim', 'promo-video', 'Vidéos promotionnelles', 5),
    ('video-anim', 'videos-courtes', 'Vidéos courtes', 6),
    ('video-anim', 'sous-titrage', 'Sous-titrage', 7),
    ('video-anim', 'postproduction', 'Postproduction', 8),
    ('ecriture', 'articles', 'Rédaction d''articles', 1),
    ('ecriture', 'redaction-web', 'Rédaction web', 2),
    ('ecriture', 'correction', 'Correction et révision', 3),
    ('ecriture', 'cv', 'Rédaction de CV', 4),
    ('ecriture', 'copywriting', 'Copywriting', 5),
    ('ecriture', 'documentation', 'Documentation technique', 6),
    ('ecriture', 'transcription', 'Transcription', 7),
    ('audio', 'production', 'Production musicale', 1),
    ('audio', 'composition', 'Composition', 2),
    ('audio', 'voix-off', 'Voix off', 3),
    ('audio', 'mixage', 'Mixage et mastering', 4),
    ('audio', 'montage-audio', 'Montage audio', 5),
    ('audio', 'podcast', 'Podcast', 6),
    ('audio', 'sound-design', 'Sound design', 7),
    ('business', 'assistance', 'Assistance virtuelle', 1),
    ('business', 'saisie', 'Saisie de données', 2),
    ('business', 'administratif', 'Organisation administrative', 3),
    ('business', 'conseil', 'Conseil', 4),
    ('business', 'documents', 'Gestion documentaire', 5),
    ('business', 'recherche-analyse', 'Recherche et analyse', 6),
    ('business', 'presentations-pro', 'Présentations professionnelles', 7),
    ('formation', 'tutorat-code', 'Tutorat en programmation', 1),
    ('formation', 'maths', 'Mathématiques', 2),
    ('formation', 'langues', 'Langues', 3),
    ('formation', 'soutien', 'Soutien scolaire', 4),
    ('formation', 'informatique-cours', 'Informatique', 5),
    ('formation', 'formation-pro', 'Formation professionnelle', 6),
    ('formation', 'examens', 'Préparation aux examens', 7),
    ('photo-evenement', 'photo-produits', 'Photographie de produits', 1),
    ('photo-evenement', 'portraits', 'Portraits', 2),
    ('photo-evenement', 'photo-evenementielle', 'Photographie événementielle', 3),
    ('photo-evenement', 'couverture', 'Couverture d''événements', 4),
    ('photo-evenement', 'contenu-evenement', 'Création de contenu événementiel', 5),
    ('services-locaux', 'creation-artisanale', 'Création artisanale', 1),
    ('services-locaux', 'decoration', 'Design et décoration', 2),
    ('services-locaux', 'reparation', 'Réparation', 3),
    ('services-locaux', 'proximite', 'Services de proximité', 4),
    ('services-locaux', 'creatif-local', 'Prestations créatives locales', 5)
) as item(parent_slug, slug, name, sort_order)
join public.talent_categories parent on parent.slug = item.parent_slug
on conflict (slug) do nothing;

insert into public.skills (category_id, name)
select id, name from public.talent_categories
where parent_id is not null
on conflict (category_id, lower(name)) do nothing;

alter table public.services
  add column if not exists steps text not null default '' check (char_length(steps) <= 1000);

alter table public.talent_profiles
  add column if not exists locality text not null default '' check (char_length(locality) <= 40);

create or replace function public.guard_talent_profile()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'profil';
  end if;
  if exists (select 1 from public.profiles where id = new.user_id and suspended_at is not null) then
    raise exception 'suspendu';
  end if;
  if public.talent_risk(new.display_name || ' ' || new.title || ' ' || new.bio || ' ' || new.locality) then
    raise exception 'contenu';
  end if;
  if cardinality(new.languages) > 5 or exists (
    select 1 from unnest(new.languages) as lang
    where lang not in ('fr', 'en', 'es', 'ht', 'pt')
  ) then
    raise exception 'langue';
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null then
    new.moderation_hold := old.moderation_hold;
    if old.moderation_hold and new.status = 'published' then
      raise exception 'retenu';
    end if;
    if old.status = 'suspended' and new.status <> 'suspended' then
      raise exception 'retenu';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  tier text not null check (tier in ('basique', 'standard', 'premium')),
  title text not null check (char_length(title) between 2 and 40),
  description text not null default '' check (char_length(description) <= 280),
  price_mode text not null check (price_mode in ('indicatif', 'convenir')),
  price_cents integer check (price_cents is null or (price_cents > 0 and price_cents <= 100000000)),
  currency text not null check (currency in ('HTG', 'USD')),
  delay_days integer not null check (delay_days between 1 and 365),
  revisions integer not null default 0 check (revisions between 0 and 20),
  includes text not null default '' check (char_length(includes) <= 500),
  active boolean not null default true,
  sort_order integer not null default 0,
  unique (service_id, tier),
  check ((price_mode = 'indicatif' and price_cents is not null) or (price_mode = 'convenir' and price_cents is null))
);

create table if not exists public.service_addons (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 60),
  price_cents integer not null check (price_cents > 0 and price_cents <= 100000000),
  currency text not null check (currency in ('HTG', 'USD')),
  active boolean not null default true
);

create table if not exists public.service_media (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  storage_path text not null check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 8388608),
  alt_text text not null default '' check (char_length(alt_text) <= 120),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.service_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

create table if not exists public.talent_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  talent_id uuid not null references public.talent_profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, talent_id),
  check (user_id <> talent_id)
);

create or replace function public.talent_fold(input text)
returns text
language sql
immutable
as $$
  select translate(lower(coalesce(input, '')), 'àâäéèêëïîôùûüçœæ', 'aaaeeeeiioouuucoeae');
$$;

create or replace function public.talent_search_ids(kind text, query text default '', category_slug text default '', max_cents integer default null, max_delay integer default null)
returns table (id uuid)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  needle text := public.talent_fold(coalesce(query, ''));
  cat uuid;
begin
  if coalesce(category_slug, '') <> '' then
    select c.id into cat from public.talent_categories c where c.slug = category_slug and c.active;
  end if;
  if kind = 'service' then
    return query
      select s.id from public.services s
      join public.talent_categories c on c.id = s.category_id
      where s.status = 'published' and not s.moderation_hold
        and (needle = '' or public.talent_fold(s.title || ' ' || s.description) like '%' || needle || '%')
        and (cat is null or s.category_id = cat or c.parent_id = cat)
        and (max_cents is null or s.price_cents is null or s.price_cents <= max_cents)
        and (max_delay is null or s.delay_days <= max_delay)
      order by s.published_at desc nulls last
      limit 24;
  elsif kind = 'talent' then
    return query
      select tp.user_id from public.talent_profiles tp
      where tp.status = 'published' and tp.show_public and not tp.moderation_hold
        and (needle = '' or public.talent_fold(tp.display_name || ' ' || tp.title || ' ' || tp.bio) like '%' || needle || '%')
      order by tp.updated_at desc
      limit 24;
  elsif kind = 'projet' then
    return query
      select o.id from public.opportunities o
      join public.talent_categories c on c.id = o.category_id
      where o.status = 'published' and not o.moderation_hold
        and (needle = '' or public.talent_fold(o.title || ' ' || o.description) like '%' || needle || '%')
        and (cat is null or o.category_id = cat or c.parent_id = cat)
      order by o.published_at desc nulls last
      limit 24;
  elsif kind = 'categorie' then
    return query
      select c.id from public.talent_categories c
      where c.active and (needle = '' or public.talent_fold(c.name || ' ' || c.description) like '%' || needle || '%')
      order by c.sort_order
      limit 24;
  end if;
end;
$$;

alter table public.service_packages enable row level security;
alter table public.service_addons enable row level security;
alter table public.service_media enable row level security;
alter table public.service_favorites enable row level security;
alter table public.talent_favorites enable row level security;

drop policy if exists "packages readable" on public.service_packages;
create policy "packages readable" on public.service_packages for select to anon, authenticated using (
  exists (select 1 from public.services offer where offer.id = service_packages.service_id and (offer.user_id = auth.uid() or (offer.status = 'published' and not offer.moderation_hold)))
);
drop policy if exists "owners write packages" on public.service_packages;
create policy "owners write packages" on public.service_packages for all to authenticated
using (exists (select 1 from public.services offer where offer.id = service_packages.service_id and offer.user_id = auth.uid()))
with check (exists (select 1 from public.services offer where offer.id = service_packages.service_id and offer.user_id = auth.uid()));

drop policy if exists "addons readable" on public.service_addons;
create policy "addons readable" on public.service_addons for select to anon, authenticated using (
  exists (select 1 from public.services offer where offer.id = service_addons.service_id and (offer.user_id = auth.uid() or (offer.status = 'published' and not offer.moderation_hold)))
);
drop policy if exists "owners write addons" on public.service_addons;
create policy "owners write addons" on public.service_addons for all to authenticated
using (exists (select 1 from public.services offer where offer.id = service_addons.service_id and offer.user_id = auth.uid()))
with check (exists (select 1 from public.services offer where offer.id = service_addons.service_id and offer.user_id = auth.uid()));

drop policy if exists "service media readable" on public.service_media;
create policy "service media readable" on public.service_media for select to anon, authenticated using (
  exists (select 1 from public.services offer where offer.id = service_media.service_id and (offer.user_id = auth.uid() or (offer.status = 'published' and not offer.moderation_hold)))
);
drop policy if exists "owners write service media" on public.service_media;
create policy "owners write service media" on public.service_media for all to authenticated
using (exists (select 1 from public.services offer where offer.id = service_media.service_id and offer.user_id = auth.uid()))
with check (
  exists (select 1 from public.services offer where offer.id = service_media.service_id and offer.user_id = auth.uid())
  and storage_path like auth.uid()::text || '/%'
);

drop policy if exists "users read own service favorites" on public.service_favorites;
create policy "users read own service favorites" on public.service_favorites for select to authenticated using (user_id = auth.uid());
drop policy if exists "users write own service favorites" on public.service_favorites;
create policy "users write own service favorites" on public.service_favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "users read own talent favorites" on public.talent_favorites;
create policy "users read own talent favorites" on public.talent_favorites for select to authenticated using (user_id = auth.uid());
drop policy if exists "users write own talent favorites" on public.talent_favorites;
create policy "users write own talent favorites" on public.talent_favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.service_packages, public.service_addons, public.service_media to anon, authenticated;
grant select, insert, update, delete on public.service_packages, public.service_addons, public.service_media to authenticated;
grant select, insert, delete on public.service_favorites, public.talent_favorites to authenticated;
grant execute on function public.talent_search_ids(text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.talent_fold(text) to anon, authenticated;

notify pgrst, 'reload schema';
