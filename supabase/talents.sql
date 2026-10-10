-- TY Space Talents. Additive: profiles, reports and notifications stay in place.
-- TY Space does not hold, collect or transfer mission funds.

create table if not exists public.talent_policy (
  id integer primary key check (id = 1),
  paid_minors_enabled boolean not null default false,
  org_offers_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.talent_policy (id) values (1) on conflict (id) do nothing;

create table if not exists public.talent_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 280),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.talent_categories (id),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 280),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists skills_category_name_idx on public.skills (category_id, lower(name));

create table if not exists public.talent_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  title text not null default '' check (char_length(title) <= 80),
  bio text not null default '' check (char_length(bio) <= 500),
  availability text not null default '' check (availability in ('', 'disponible', 'limitee', 'indisponible')),
  languages text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden', 'suspended')),
  show_public boolean not null default false,
  moderation_hold boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.talent_profile_categories (
  user_id uuid not null references public.talent_profiles (user_id) on delete cascade,
  category_id uuid not null references public.talent_categories (id),
  primary key (user_id, category_id)
);

create table if not exists public.talent_skills (
  user_id uuid not null references public.talent_profiles (user_id) on delete cascade,
  skill_id uuid not null references public.skills (id),
  level text not null default 'decouverte' check (level in ('decouverte', 'pratique', 'aise', 'avance')),
  primary key (user_id, skill_id)
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.talent_profiles (user_id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  category_id uuid references public.talent_categories (id),
  role_label text not null default '' check (char_length(role_label) <= 80),
  origin text not null check (origin in ('personnel', 'educatif', 'client', 'equipe', 'exercice')),
  period_label text not null default '' check (char_length(period_label) <= 40),
  external_url text not null default '' check (external_url = '' or external_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolio_items_owner_idx on public.portfolio_items (user_id, sort_order, updated_at desc);

create table if not exists public.portfolio_skills (
  item_id uuid not null references public.portfolio_items (id) on delete cascade,
  skill_id uuid not null references public.skills (id),
  primary key (item_id, skill_id)
);

create table if not exists public.portfolio_media (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.portfolio_items (id) on delete cascade,
  storage_path text not null check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size integer not null check (file_size > 0 and file_size <= 8388608),
  created_at timestamptz not null default now()
);

create index if not exists portfolio_media_item_idx on public.portfolio_media (item_id);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.talent_profiles (user_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 20 and 4000),
  category_id uuid not null references public.talent_categories (id),
  offer_kind text not null check (offer_kind in ('creation', 'cours', 'conseil', 'assistance', 'autre')),
  deliverables text not null check (char_length(deliverables) between 2 and 500),
  price_mode text not null check (price_mode in ('indicatif', 'convenir')),
  price_cents integer check (price_cents is null or (price_cents > 0 and price_cents <= 100000000)),
  currency text not null default 'HTG' check (currency in ('HTG', 'USD')),
  delay_days integer not null check (delay_days between 1 and 365),
  revisions integer not null default 0 check (revisions between 0 and 20),
  prerequisites text not null default '' check (char_length(prerequisites) <= 500),
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'suspended', 'archived', 'removed')),
  moderation_hold boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (price_mode = 'indicatif' and price_cents is not null)
    or (price_mode = 'convenir' and price_cents is null)
  )
);

create index if not exists services_public_idx on public.services (published_at desc) where status = 'published';
create index if not exists services_owner_idx on public.services (user_id, updated_at desc);

create table if not exists public.service_skills (
  service_id uuid not null references public.services (id) on delete cascade,
  skill_id uuid not null references public.skills (id),
  primary key (service_id, skill_id)
);

create table if not exists public.service_examples (
  service_id uuid not null references public.services (id) on delete cascade,
  item_id uuid not null references public.portfolio_items (id) on delete restrict,
  primary key (service_id, item_id)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  client_kind text not null check (client_kind in ('membre', 'particulier', 'association', 'entreprise')),
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 20 and 4000),
  category_id uuid not null references public.talent_categories (id),
  deliverables text not null check (char_length(deliverables) between 2 and 500),
  budget_mode text not null check (budget_mode in ('indicatif', 'discuter')),
  budget_cents integer check (budget_cents is null or (budget_cents > 0 and budget_cents <= 100000000)),
  currency text not null default 'HTG' check (currency in ('HTG', 'USD')),
  deadline date,
  duration_days integer not null check (duration_days between 1 and 365),
  seats integer not null default 1 check (seats between 1 and 10),
  mission_type text not null check (mission_type in ('educatif', 'creatif', 'benevole', 'remuneree', 'associatif', 'concours', 'personnel')),
  conditions text not null default '' check (char_length(conditions) <= 500),
  open_to_minors boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'closed', 'archived', 'suspended', 'removed')),
  moderation_hold boolean not null default false,
  last_change_summary text not null default '' check (char_length(last_change_summary) <= 280),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (budget_mode = 'indicatif' and budget_cents is not null)
    or (budget_mode = 'discuter' and budget_cents is null)
  )
);

create index if not exists opportunities_public_idx on public.opportunities (published_at desc) where status = 'published';
create index if not exists opportunities_client_idx on public.opportunities (client_id, updated_at desc);

create table if not exists public.opportunity_skills (
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  skill_id uuid not null references public.skills (id),
  primary key (opportunity_id, skill_id)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pitch text not null default '' check (char_length(pitch) <= 2000),
  delay_days integer check (delay_days is null or delay_days between 1 and 365),
  price_mode text not null default 'convenir' check (price_mode in ('indicatif', 'convenir')),
  price_cents integer check (price_cents is null or (price_cents > 0 and price_cents <= 100000000)),
  question text not null default '' check (char_length(question) <= 500),
  status text not null default 'draft' check (status in ('draft', 'sent', 'reviewing', 'shortlisted', 'accepted', 'refused', 'withdrawn', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, user_id),
  check (
    (price_mode = 'indicatif' and price_cents is not null)
    or (price_mode = 'convenir' and price_cents is null)
  )
);

create index if not exists applications_user_idx on public.applications (user_id, updated_at desc);

create table if not exists public.application_works (
  application_id uuid not null references public.applications (id) on delete cascade,
  item_id uuid not null references public.portfolio_items (id) on delete restrict,
  primary key (application_id, item_id)
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  client_id uuid not null references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 2 and 1000),
  status text not null default 'sent' check (status in ('sent', 'accepted', 'refused', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, client_id)
);

create table if not exists public.talent_projects (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid unique references public.opportunities (id),
  service_id uuid unique references public.services (id),
  application_id uuid unique references public.applications (id),
  request_id uuid unique references public.service_requests (id),
  client_id uuid not null references public.profiles (id),
  provider_id uuid not null references public.profiles (id),
  title text not null check (char_length(title) between 3 and 80),
  description text not null check (char_length(description) between 2 and 4000),
  price_cents integer check (price_cents is null or (price_cents >= 0 and price_cents <= 100000000)),
  price_mode text not null check (price_mode in ('indicatif', 'convenir', 'discuter')),
  currency text not null check (currency in ('HTG', 'USD')),
  delay_days integer not null check (delay_days between 1 and 365),
  deliverables text not null check (char_length(deliverables) between 2 and 500),
  revision_limit integer check (revision_limit is null or revision_limit between 0 and 20),
  revisions_used integer not null default 0 check (revisions_used >= 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'preparing', 'active', 'delivered', 'revision', 'accepted', 'done', 'cancelled', 'dispute')),
  cancellation_requested_by uuid references public.profiles (id),
  cancellation_reason text not null default '' check (char_length(cancellation_reason) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id <> provider_id),
  check ((opportunity_id is not null) <> (service_id is not null))
);

create index if not exists talent_projects_client_idx on public.talent_projects (client_id, updated_at desc);
create index if not exists talent_projects_provider_idx on public.talent_projects (provider_id, updated_at desc);

create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.talent_projects (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  kind text not null check (char_length(kind) between 2 and 40),
  note text not null default '' check (char_length(note) <= 280),
  created_at timestamptz not null default now()
);

create index if not exists project_events_project_idx on public.project_events (project_id, created_at);

create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.talent_projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  comment text not null default '' check (char_length(comment) <= 1000),
  storage_path text not null default '' check (storage_path = '' or storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$'),
  external_url text not null default '' check (external_url = '' or external_url ~ '^https://'),
  version integer not null check (version > 0),
  created_at timestamptz not null default now(),
  check (storage_path <> '' or external_url <> '' or comment <> '')
);

create index if not exists project_deliverables_project_idx on public.project_deliverables (project_id, version);

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.talent_projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists project_messages_project_idx on public.project_messages (project_id, created_at);

create table if not exists public.project_amendments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.talent_projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  price_cents integer check (price_cents is null or (price_cents >= 0 and price_cents <= 100000000)),
  price_mode text not null check (price_mode in ('indicatif', 'convenir', 'discuter')),
  delay_days integer not null check (delay_days between 1 and 365),
  deliverables text not null check (char_length(deliverables) between 2 and 500),
  note text not null default '' check (char_length(note) <= 280),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.talent_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.talent_projects (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  subject_id uuid not null references public.profiles (id),
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 2 and 800),
  reply text not null default '' check (char_length(reply) <= 800),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  unique (project_id, author_id),
  check (author_id <> subject_id)
);

create index if not exists talent_reviews_subject_idx on public.talent_reviews (subject_id, created_at desc) where status = 'published';

create table if not exists public.talent_authorizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('parental_paid')),
  status text not null default 'requested' check (status in ('requested', 'pending_review', 'granted', 'revoked')),
  method text not null default '' check (char_length(method) <= 80),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles (id),
  unique (user_id, kind)
);

create table if not exists public.talent_authorization_notes (
  authorization_id uuid primary key references public.talent_authorizations (id) on delete cascade,
  proof_note text not null default '' check (char_length(proof_note) <= 500)
);

create table if not exists public.talent_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null check (char_length(action) between 2 and 40),
  target_type text not null check (char_length(target_type) between 2 and 40),
  target_id text not null check (char_length(target_id) between 1 and 80),
  reason text not null default '' check (char_length(reason) <= 280),
  created_at timestamptz not null default now()
);

create index if not exists talent_audit_created_idx on public.talent_audit (created_at desc);

insert into public.talent_categories (slug, name, description, sort_order)
values
  ('web', 'Développement web et logiciel', 'Sites, applications et outils.', 1),
  ('informatique', 'Informatique et assistance numérique', 'Aide à l''utilisation d''outils numériques.', 2),
  ('design', 'Design graphique', 'Visuels, identités et mises en page.', 3),
  ('illustration', 'Illustration et création artistique', 'Dessins et créations originales.', 4),
  ('video', 'Montage vidéo et animation', 'Montage de vidéos courtes et animation.', 5),
  ('photo', 'Photographie et retouche', 'Photos et retouches autorisées.', 6),
  ('redaction', 'Rédaction et correction', 'Textes, relecture et correction.', 7),
  ('traduction', 'Traduction et langues', 'Traduction entre langues déclarées.', 8),
  ('education', 'Éducation et tutorat', 'Aide à l''apprentissage autorisée.', 9),
  ('contenu', 'Présentation et création de contenu', 'Présentations et contenus originaux.', 10),
  ('marketing', 'Marketing et communication', 'Messages et supports de communication.', 11),
  ('artisanat', 'Artisanat et créations manuelles', 'Objets et créations faits main.', 12),
  ('musique', 'Musique et audio', 'Musique, voix et montage audio.', 13),
  ('autres', 'Autres compétences autorisées', 'Compétences qui ne rentrent pas ailleurs.', 14)
on conflict (slug) do nothing;

insert into public.skills (category_id, name, description)
select id, name, '' from public.talent_categories
on conflict (category_id, lower(name)) do nothing;

create or replace function public.talent_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.talent_risk(input text)
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
  if public.contains_explicit(input) then
    return true;
  end if;
  normalized := translate(lower(input), 'àâäéèêëïîôùûüçœæ', 'aaaeeeeiioouuucoeae');
  if normalized ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    return true;
  end if;
  if normalized ~ '(^|[^0-9])\+?[0-9][0-9 .()-]{7,16}[0-9]' then
    return true;
  end if;
  if normalized ~ '(whatsapp|telegram|snapchat|instagram|signal|discord|tiktok|mot de passe|code de verification|carte bancaire|western union)' then
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.talent_paid_authorized(person uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.talent_authorizations
    where user_id = person and kind = 'parental_paid' and status = 'granted'
  );
$$;

create or replace function public.talent_apply_block(actor uuid, opportunity uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_age text;
  actor_suspended timestamptz;
  client_age text;
  opp public.opportunities%rowtype;
  policy public.talent_policy%rowtype;
begin
  if actor is null then return 'auth'; end if;
  select age_band, suspended_at into actor_age, actor_suspended from public.profiles where id = actor;
  if actor_suspended is not null then return 'suspendu'; end if;
  if actor_age is null then return 'profil'; end if;
  select * into opp from public.opportunities where id = opportunity;
  if opp.id is null then return 'introuvable'; end if;
  if opp.status <> 'published' or opp.moderation_hold then return 'fermee'; end if;
  if opp.client_id = actor then return 'soi'; end if;
  select age_band into client_age from public.profiles where id = opp.client_id;
  if public.minor_contact_blocked(actor, opp.client_id) or public.minor_contact_blocked(opp.client_id, actor) then
    return 'contact';
  end if;
  if actor_age = 'unknown' then return 'age'; end if;
  if opp.deadline is not null and opp.deadline < current_date then return 'date'; end if;
  select * into policy from public.talent_policy where id = 1;
  if opp.mission_type = 'remuneree' and actor_age in ('12-15', '16-17') then
    if not coalesce(policy.paid_minors_enabled, false) then return 'verification'; end if;
    if not public.talent_paid_authorized(actor) then return 'autorisation'; end if;
  end if;
  if actor_age in ('12-15', '16-17') and not opp.open_to_minors then return 'age'; end if;
  if opp.client_kind in ('association', 'entreprise') and opp.open_to_minors and not coalesce(policy.org_offers_enabled, false) then
    return 'organisation';
  end if;
  return null;
end;
$$;

create or replace function public.talent_opportunity_visible(viewer uuid, opportunity uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  opp public.opportunities%rowtype;
  viewer_age text;
  policy public.talent_policy%rowtype;
begin
  select * into opp from public.opportunities where id = opportunity;
  if opp.id is null then return false; end if;
  if viewer is not null and viewer = opp.client_id then return true; end if;
  if opp.status <> 'published' or opp.moderation_hold then return false; end if;
  if viewer is not null and (
    public.minor_contact_blocked(viewer, opp.client_id)
    or public.minor_contact_blocked(opp.client_id, viewer)
  ) then
    return false;
  end if;
  select * into policy from public.talent_policy where id = 1;
  if viewer is null then
    return not opp.open_to_minors;
  end if;
  select age_band into viewer_age from public.profiles where id = viewer;
  if viewer_age in ('12-15', '16-17') then
    if not opp.open_to_minors then return false; end if;
    if opp.mission_type = 'remuneree' and not coalesce(policy.paid_minors_enabled, false) then return false; end if;
    if opp.client_kind in ('association', 'entreprise') and not coalesce(policy.org_offers_enabled, false) then return false; end if;
  elsif viewer_age = '23+' then
    if opp.open_to_minors then return false; end if;
  elsif viewer_age is null or viewer_age = 'unknown' then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.talent_notify(person uuid, kind text, target uuid, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if person is null or person = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, kind, content_type, content_id, note)
  values (person, left(kind, 40), 'talent', target::text, left(coalesce(note, ''), 160));
end;
$$;

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
  if public.talent_risk(new.display_name || ' ' || new.title || ' ' || new.bio) then
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

create or replace function public.guard_portfolio_item()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'profil';
  end if;
  if public.talent_risk(new.title || ' ' || new.description || ' ' || new.role_label) then
    raise exception 'contenu';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_service()
returns trigger
language plpgsql
as $$
declare
  age text;
  policy public.talent_policy%rowtype;
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'profil';
  end if;
  if public.talent_risk(new.title || ' ' || new.description || ' ' || new.deliverables || ' ' || new.prerequisites) then
    raise exception 'contenu';
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null then
    new.moderation_hold := old.moderation_hold;
    if old.moderation_hold and new.status = 'published' then
      raise exception 'retenu';
    end if;
    if old.status = 'suspended' and new.status = 'published' then
      raise exception 'retenu';
    end if;
  end if;
  if new.status = 'published' and auth.uid() is not null then
    select age_band into age from public.profiles where id = new.user_id;
    select * into policy from public.talent_policy where id = 1;
    if age in ('12-15', '16-17') and (
      not coalesce(policy.paid_minors_enabled, false) or not public.talent_paid_authorized(new.user_id)
    ) then
      raise exception 'verification';
    end if;
    if age is null or age = 'unknown' then
      raise exception 'age';
    end if;
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_opportunity()
returns trigger
language plpgsql
as $$
declare
  policy public.talent_policy%rowtype;
begin
  if auth.uid() is not null and auth.uid() <> new.client_id then
    raise exception 'profil';
  end if;
  if public.talent_risk(new.title || ' ' || new.description || ' ' || new.deliverables || ' ' || new.conditions) then
    raise exception 'contenu';
  end if;
  if new.mission_type = 'benevole' and (new.budget_mode = 'indicatif' or coalesce(new.budget_cents, 0) > 0) then
    raise exception 'benevole';
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null then
    new.moderation_hold := old.moderation_hold;
    if old.moderation_hold and new.status = 'published' then
      raise exception 'retenu';
    end if;
    if old.status in ('closed', 'suspended', 'removed') and new.status = 'published' and old.moderation_hold then
      raise exception 'retenu';
    end if;
    if old.status = 'published' and new.status = 'published' and (
      new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.budget_cents is distinct from old.budget_cents
      or new.deadline is distinct from old.deadline
      or new.deliverables is distinct from old.deliverables
    ) then
      new.last_change_summary := left('Les conditions publiées ont été modifiées.', 280);
    end if;
  end if;
  select * into policy from public.talent_policy where id = 1;
  if new.status = 'published' and new.client_kind in ('association', 'entreprise') and new.open_to_minors and not coalesce(policy.org_offers_enabled, false) then
    new.status := 'pending';
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_application()
returns trigger
language plpgsql
as $$
declare
  reason text;
  recent_count integer;
begin
  if current_user in ('postgres', 'supabase_admin') then
    new.updated_at := now();
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'auth';
  end if;
  if tg_op = 'INSERT' and new.user_id <> auth.uid() then
    raise exception 'profil';
  end if;
  if tg_op = 'UPDATE' and (new.user_id <> old.user_id or new.opportunity_id <> old.opportunity_id) then
    raise exception 'profil';
  end if;
  if public.talent_risk(new.pitch || ' ' || new.question) then
    raise exception 'contenu';
  end if;
  if tg_op = 'INSERT' then
    select count(*) into recent_count from public.applications
    where user_id = new.user_id and created_at > now() - interval '1 day';
    if recent_count >= 10 then raise exception 'frequence'; end if;
  end if;
  if new.status in ('sent', 'reviewing', 'shortlisted') then
    reason := public.talent_apply_block(new.user_id, new.opportunity_id);
    if reason is not null then raise exception '%', reason; end if;
  end if;
  if tg_op = 'UPDATE' and auth.uid() is distinct from new.user_id then
    if new.pitch is distinct from old.pitch or new.question is distinct from old.question
      or new.price_cents is distinct from old.price_cents or new.price_mode is distinct from old.price_mode
      or new.delay_days is distinct from old.delay_days then
      raise exception 'profil';
    end if;
    if new.status not in ('reviewing', 'shortlisted', 'refused') or old.status not in ('sent', 'reviewing', 'shortlisted') then
      raise exception 'statut';
    end if;
  end if;
  if tg_op = 'UPDATE' and auth.uid() = new.user_id then
    if old.status in ('accepted', 'refused', 'cancelled') or new.status = 'accepted' then
      raise exception 'statut';
    end if;
    if new.status = 'withdrawn' and old.status in ('draft', 'sent', 'reviewing', 'shortlisted') then
      null;
    elsif old.status in ('draft', 'sent') and new.status in ('draft', 'sent') then
      null;
    else
      raise exception 'statut';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_service_request()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    new.updated_at := now();
    return new;
  end if;
  if auth.uid() is null or auth.uid() <> old.client_id then
    raise exception 'profil';
  end if;
  if old.status <> 'sent' or new.status <> 'withdrawn' then
    raise exception 'statut';
  end if;
  if new.message is distinct from old.message or new.client_id <> old.client_id or new.service_id <> old.service_id then
    raise exception 'profil';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.talent_accept(application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.applications%rowtype;
  opp public.opportunities%rowtype;
  reason text;
  project uuid;
  accepted_count integer;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select * into app from public.applications where id = application_id for update;
  if app.id is null then raise exception 'introuvable'; end if;
  select * into opp from public.opportunities where id = app.opportunity_id for update;
  if opp.client_id <> auth.uid() then raise exception 'profil'; end if;
  if opp.status <> 'published' or opp.moderation_hold then raise exception 'fermee'; end if;
  if app.status not in ('sent', 'reviewing', 'shortlisted') then raise exception 'statut'; end if;
  reason := public.talent_apply_block(app.user_id, opp.id);
  if reason is not null then raise exception '%', reason; end if;
  select count(*) into accepted_count from public.applications where opportunity_id = opp.id and status = 'accepted';
  if accepted_count >= opp.seats then raise exception 'places'; end if;
  if exists (select 1 from public.talent_projects where provider_id = app.user_id and client_id = opp.client_id and status not in ('done', 'cancelled')) then
    raise exception 'projet';
  end if;
  update public.applications set status = 'accepted', updated_at = now() where id = app.id;
  insert into public.talent_projects (
    opportunity_id, application_id, client_id, provider_id, title, description,
    price_cents, price_mode, currency, delay_days, deliverables, revision_limit, status
  ) values (
    opp.id, app.id, opp.client_id, app.user_id, opp.title, opp.description,
    coalesce(app.price_cents, opp.budget_cents),
    case when app.price_cents is not null then 'indicatif' else opp.budget_mode end,
    opp.currency,
    coalesce(app.delay_days, opp.duration_days),
    opp.deliverables,
    null,
    'confirmed'
  ) returning id into project;
  insert into public.project_events (project_id, actor_id, kind, note)
  values (project, auth.uid(), 'confirmed', 'Candidature acceptée.');
  perform public.talent_notify(app.user_id, 'talent_application', project, 'Votre candidature a été acceptée.');
  if accepted_count + 1 >= opp.seats then
    update public.opportunities set status = 'closed', updated_at = now() where id = opp.id;
  end if;
  return project;
end;
$$;

create or replace function public.talent_request_service(service_id uuid, note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  offer public.services%rowtype;
  age text;
  client_age text;
  policy public.talent_policy%rowtype;
  request uuid;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  if public.talent_risk(note) then raise exception 'contenu'; end if;
  select age_band into age from public.profiles where id = auth.uid() and suspended_at is null;
  if age is null then raise exception 'suspendu'; end if;
  select * into offer from public.services where id = service_id;
  if offer.id is null or offer.status <> 'published' or offer.moderation_hold then raise exception 'fermee'; end if;
  if offer.user_id = auth.uid() then raise exception 'soi'; end if;
  if public.minor_contact_blocked(auth.uid(), offer.user_id) or public.minor_contact_blocked(offer.user_id, auth.uid()) then
    raise exception 'contact';
  end if;
  select * into policy from public.talent_policy where id = 1;
  select age_band into client_age from public.profiles where id = offer.user_id;
  if age in ('12-15', '16-17') or client_age in ('12-15', '16-17') then
    if not coalesce(policy.paid_minors_enabled, false) then raise exception 'verification'; end if;
    if age in ('12-15', '16-17') and not public.talent_paid_authorized(auth.uid()) then raise exception 'autorisation'; end if;
    if client_age in ('12-15', '16-17') and not public.talent_paid_authorized(offer.user_id) then raise exception 'verification'; end if;
  end if;
  if age = 'unknown' or client_age = 'unknown' then raise exception 'age'; end if;
  insert into public.service_requests (service_id, client_id, message)
  values (offer.id, auth.uid(), left(btrim(note), 1000))
  returning id into request;
  perform public.talent_notify(offer.user_id, 'talent_request', offer.id, 'Nouvelle demande de prestation.');
  return request;
end;
$$;

create or replace function public.talent_accept_request(request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.service_requests%rowtype;
  offer public.services%rowtype;
  project uuid;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select * into req from public.service_requests where id = request_id for update;
  if req.id is null or req.status <> 'sent' then raise exception 'statut'; end if;
  select * into offer from public.services where id = req.service_id;
  if offer.user_id <> auth.uid() then raise exception 'profil'; end if;
  if offer.status <> 'published' or offer.moderation_hold then raise exception 'fermee'; end if;
  if public.minor_contact_blocked(auth.uid(), req.client_id) or public.minor_contact_blocked(req.client_id, auth.uid()) then
    raise exception 'contact';
  end if;
  if exists (
    select 1 from public.talent_projects
    where client_id = req.client_id and provider_id = offer.user_id and status not in ('done', 'cancelled')
  ) then
    raise exception 'projet';
  end if;
  update public.service_requests set status = 'accepted', updated_at = now() where id = req.id;
  insert into public.talent_projects (
    service_id, request_id, client_id, provider_id, title, description,
    price_cents, price_mode, currency, delay_days, deliverables, revision_limit, status
  ) values (
    offer.id, req.id, req.client_id, offer.user_id, offer.title, offer.description,
    offer.price_cents, offer.price_mode, offer.currency, offer.delay_days, offer.deliverables, offer.revisions, 'confirmed'
  ) returning id into project;
  insert into public.project_events (project_id, actor_id, kind, note)
  values (project, auth.uid(), 'confirmed', 'Demande de prestation acceptée.');
  perform public.talent_notify(req.client_id, 'talent_request', project, 'Votre demande de prestation a été acceptée.');
  return project;
end;
$$;

create or replace function public.guard_talent_project()
returns trigger
language plpgsql
as $$
declare
  provider_move boolean;
  client_move boolean;
begin
  if current_user in ('postgres', 'supabase_admin') then
    new.updated_at := now();
    return new;
  end if;
  if auth.uid() is null or auth.uid() not in (old.client_id, old.provider_id) then
    raise exception 'profil';
  end if;
  if new.client_id <> old.client_id or new.provider_id <> old.provider_id
    or new.opportunity_id is distinct from old.opportunity_id
    or new.service_id is distinct from old.service_id
    or new.price_cents is distinct from old.price_cents
    or new.price_mode <> old.price_mode
    or new.currency <> old.currency
    or new.delay_days <> old.delay_days
    or new.deliverables <> old.deliverables
    or new.revision_limit is distinct from old.revision_limit
    or new.title <> old.title
    or new.description <> old.description then
    raise exception 'conditions';
  end if;
  if new.status = old.status then
    if new.cancellation_requested_by is not null and new.cancellation_requested_by <> auth.uid() then
      raise exception 'profil';
    end if;
    new.updated_at := now();
    return new;
  end if;
  if old.status = 'dispute' or old.status in ('done', 'cancelled') then
    raise exception 'litige';
  end if;
  if new.status = 'cancelled' and (old.cancellation_requested_by is null or old.cancellation_requested_by = auth.uid()) then
    raise exception 'annulation';
  end if;
  provider_move := auth.uid() = old.provider_id and (
    (old.status = 'confirmed' and new.status = 'preparing')
    or (old.status = 'preparing' and new.status = 'active')
    or (old.status = 'active' and new.status = 'delivered')
    or (old.status = 'revision' and new.status = 'delivered')
  );
  client_move := auth.uid() = old.client_id and (
    (old.status = 'delivered' and new.status = 'revision')
    or (old.status = 'delivered' and new.status = 'accepted')
    or (old.status = 'accepted' and new.status = 'done')
  );
  if new.status = 'revision' and old.revision_limit is not null and old.revisions_used >= old.revision_limit then
    raise exception 'revisions';
  end if;
  if not provider_move and not client_move and new.status not in ('cancelled', 'dispute') then
    raise exception 'statut';
  end if;
  if new.status = 'revision' and old.status = 'delivered' then
    new.revisions_used := old.revisions_used + 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.apply_project_amendment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    update public.talent_projects
    set price_cents = new.price_cents,
        price_mode = new.price_mode,
        delay_days = new.delay_days,
        deliverables = new.deliverables
    where id = new.project_id;
    insert into public.project_events (project_id, actor_id, kind, note)
    values (new.project_id, auth.uid(), 'amendment', 'Les conditions ont été acceptées.');
  end if;
  return new;
end;
$$;

create or replace function public.guard_project_message()
returns trigger
language plpgsql
as $$
declare
  project public.talent_projects%rowtype;
begin
  select * into project from public.talent_projects where id = new.project_id;
  if project.id is null or new.author_id not in (project.client_id, project.provider_id) then
    raise exception 'profil';
  end if;
  if auth.uid() is not null and auth.uid() <> new.author_id then
    raise exception 'profil';
  end if;
  if public.minor_contact_blocked(project.client_id, project.provider_id)
    or public.minor_contact_blocked(project.provider_id, project.client_id) then
    raise exception 'contact';
  end if;
  if public.talent_risk(new.body) then
    raise exception 'contenu';
  end if;
  if (
    select count(*) from public.project_messages
    where author_id = new.author_id and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'frequence';
  end if;
  return new;
end;
$$;

create or replace function public.guard_talent_review()
returns trigger
language plpgsql
as $$
declare
  project public.talent_projects%rowtype;
begin
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if new.rating <> old.rating or new.body <> old.body or new.author_id <> old.author_id or new.project_id <> old.project_id then
      raise exception 'avis';
    end if;
    if new.reply is distinct from old.reply and auth.uid() <> old.subject_id then
      raise exception 'avis';
    end if;
    if old.reply <> '' and new.reply is distinct from old.reply then
      raise exception 'avis';
    end if;
    new.status := old.status;
  end if;
  if tg_op = 'INSERT' then
    select * into project from public.talent_projects where id = new.project_id;
    if project.status <> 'done' then raise exception 'avis'; end if;
    if new.author_id not in (project.client_id, project.provider_id) then raise exception 'avis'; end if;
    if new.subject_id not in (project.client_id, project.provider_id) or new.subject_id = new.author_id then
      raise exception 'avis';
    end if;
    if public.talent_risk(new.body) then raise exception 'contenu'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_talent_authorization()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      if new.user_id <> auth.uid() or new.status <> 'requested' or new.reviewer_id is not null or new.reviewed_at is not null then
        raise exception 'autorisation';
      end if;
    else
      raise exception 'autorisation';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.notify_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client uuid;
begin
  select client_id into client from public.opportunities where id = new.opportunity_id;
  if tg_op = 'INSERT' and new.status = 'sent' then
    perform public.talent_notify(client, 'talent_application', new.opportunity_id, 'Nouvelle candidature.');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status <> 'accepted' then
    perform public.talent_notify(new.user_id, 'talent_application', new.opportunity_id, 'Le statut de votre candidature a changé.');
  end if;
  return new;
end;
$$;

create or replace function public.notify_opportunity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant uuid;
begin
  if tg_op = 'UPDATE' and new.last_change_summary <> '' and new.last_change_summary is distinct from old.last_change_summary then
    for applicant in select user_id from public.applications where opportunity_id = new.id and status in ('sent', 'reviewing', 'shortlisted')
    loop
      perform public.talent_notify(applicant, 'talent_change', new.id, new.last_change_summary);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists talent_profiles_guard on public.talent_profiles;
create trigger talent_profiles_guard before insert or update on public.talent_profiles
for each row execute function public.guard_talent_profile();

drop trigger if exists portfolio_items_guard on public.portfolio_items;
create trigger portfolio_items_guard before insert or update on public.portfolio_items
for each row execute function public.guard_portfolio_item();

drop trigger if exists services_guard on public.services;
create trigger services_guard before insert or update on public.services
for each row execute function public.guard_service();

drop trigger if exists opportunities_guard on public.opportunities;
create trigger opportunities_guard before insert or update on public.opportunities
for each row execute function public.guard_opportunity();

drop trigger if exists applications_guard on public.applications;
create trigger applications_guard before insert or update on public.applications
for each row execute function public.guard_application();

drop trigger if exists service_requests_guard on public.service_requests;
create trigger service_requests_guard before update on public.service_requests
for each row execute function public.guard_service_request();

drop trigger if exists talent_projects_guard on public.talent_projects;
create trigger talent_projects_guard before update on public.talent_projects
for each row execute function public.guard_talent_project();

drop trigger if exists project_amendments_apply on public.project_amendments;
create trigger project_amendments_apply after update on public.project_amendments
for each row execute function public.apply_project_amendment();

drop trigger if exists project_messages_guard on public.project_messages;
create trigger project_messages_guard before insert on public.project_messages
for each row execute function public.guard_project_message();

drop trigger if exists talent_reviews_guard on public.talent_reviews;
create trigger talent_reviews_guard before insert or update on public.talent_reviews
for each row execute function public.guard_talent_review();

drop trigger if exists talent_authorizations_guard on public.talent_authorizations;
create trigger talent_authorizations_guard before insert or update on public.talent_authorizations
for each row execute function public.guard_talent_authorization();

drop trigger if exists applications_notify on public.applications;
create trigger applications_notify after insert or update on public.applications
for each row execute function public.notify_application();

drop trigger if exists opportunities_notify on public.opportunities;
create trigger opportunities_notify after update on public.opportunities
for each row execute function public.notify_opportunity_change();

alter table public.talent_policy enable row level security;
alter table public.talent_categories enable row level security;
alter table public.skills enable row level security;
alter table public.talent_profiles enable row level security;
alter table public.talent_profile_categories enable row level security;
alter table public.talent_skills enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.portfolio_skills enable row level security;
alter table public.portfolio_media enable row level security;
alter table public.services enable row level security;
alter table public.service_skills enable row level security;
alter table public.service_examples enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_skills enable row level security;
alter table public.applications enable row level security;
alter table public.application_works enable row level security;
alter table public.service_requests enable row level security;
alter table public.talent_projects enable row level security;
alter table public.project_events enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.project_messages enable row level security;
alter table public.project_amendments enable row level security;
alter table public.talent_reviews enable row level security;
alter table public.talent_authorizations enable row level security;
alter table public.talent_authorization_notes enable row level security;
alter table public.talent_audit enable row level security;

drop policy if exists "talent policy is readable" on public.talent_policy;
create policy "talent policy is readable" on public.talent_policy for select to anon, authenticated using (true);

drop policy if exists "categories are readable" on public.talent_categories;
create policy "categories are readable" on public.talent_categories for select to anon, authenticated using (true);
drop policy if exists "skills are readable" on public.skills;
create policy "skills are readable" on public.skills for select to anon, authenticated using (true);

drop policy if exists "talent profiles are readable" on public.talent_profiles;
create policy "talent profiles are readable" on public.talent_profiles for select to anon, authenticated using (
  user_id = auth.uid() or (status = 'published' and show_public and not moderation_hold)
);
drop policy if exists "users insert own talent profile" on public.talent_profiles;
create policy "users insert own talent profile" on public.talent_profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users update own talent profile" on public.talent_profiles;
create policy "users update own talent profile" on public.talent_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "profile categories readable" on public.talent_profile_categories;
create policy "profile categories readable" on public.talent_profile_categories for select to anon, authenticated using (
  exists (select 1 from public.talent_profiles tp where tp.user_id = talent_profile_categories.user_id and (tp.user_id = auth.uid() or (tp.status = 'published' and tp.show_public and not tp.moderation_hold)))
);
drop policy if exists "users write own profile categories" on public.talent_profile_categories;
create policy "users write own profile categories" on public.talent_profile_categories for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "talent skills readable" on public.talent_skills;
create policy "talent skills readable" on public.talent_skills for select to anon, authenticated using (
  exists (select 1 from public.talent_profiles tp where tp.user_id = talent_skills.user_id and (tp.user_id = auth.uid() or (tp.status = 'published' and tp.show_public and not tp.moderation_hold)))
);
drop policy if exists "users write own talent skills" on public.talent_skills;
create policy "users write own talent skills" on public.talent_skills for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "portfolio items readable" on public.portfolio_items;
create policy "portfolio items readable" on public.portfolio_items for select to anon, authenticated using (
  user_id = auth.uid() or (
    status = 'published' and exists (
      select 1 from public.talent_profiles tp
      where tp.user_id = portfolio_items.user_id and tp.status = 'published' and tp.show_public and not tp.moderation_hold
    )
  )
);
drop policy if exists "users insert own portfolio" on public.portfolio_items;
create policy "users insert own portfolio" on public.portfolio_items for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users update own portfolio" on public.portfolio_items;
create policy "users update own portfolio" on public.portfolio_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users delete own portfolio" on public.portfolio_items;
create policy "users delete own portfolio" on public.portfolio_items for delete to authenticated using (user_id = auth.uid());

drop policy if exists "portfolio skills readable" on public.portfolio_skills;
create policy "portfolio skills readable" on public.portfolio_skills for select to anon, authenticated using (
  exists (select 1 from public.portfolio_items item where item.id = portfolio_skills.item_id and (item.user_id = auth.uid() or item.status = 'published'))
);
drop policy if exists "users write own portfolio skills" on public.portfolio_skills;
create policy "users write own portfolio skills" on public.portfolio_skills for all to authenticated
using (exists (select 1 from public.portfolio_items item where item.id = portfolio_skills.item_id and item.user_id = auth.uid()))
with check (exists (select 1 from public.portfolio_items item where item.id = portfolio_skills.item_id and item.user_id = auth.uid()));

drop policy if exists "portfolio media readable" on public.portfolio_media;
create policy "portfolio media readable" on public.portfolio_media for select to anon, authenticated using (
  exists (
    select 1 from public.portfolio_items item
    join public.talent_profiles tp on tp.user_id = item.user_id
    where item.id = portfolio_media.item_id
      and (item.user_id = auth.uid() or (item.status = 'published' and tp.status = 'published' and tp.show_public and not tp.moderation_hold))
  )
);
drop policy if exists "users insert own portfolio media" on public.portfolio_media;
create policy "users insert own portfolio media" on public.portfolio_media for insert to authenticated with check (
  exists (select 1 from public.portfolio_items item where item.id = portfolio_media.item_id and item.user_id = auth.uid())
  and storage_path like auth.uid()::text || '/%'
);
drop policy if exists "users delete own portfolio media" on public.portfolio_media;
create policy "users delete own portfolio media" on public.portfolio_media for delete to authenticated using (
  exists (select 1 from public.portfolio_items item where item.id = portfolio_media.item_id and item.user_id = auth.uid())
);

drop policy if exists "services readable" on public.services;
create policy "services readable" on public.services for select to anon, authenticated using (
  user_id = auth.uid() or (
    status = 'published' and not moderation_hold and exists (
      select 1 from public.talent_profiles tp
      where tp.user_id = services.user_id and tp.status = 'published' and tp.show_public and not tp.moderation_hold
    )
  )
);
drop policy if exists "users insert own services" on public.services;
create policy "users insert own services" on public.services for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "users update own services" on public.services;
create policy "users update own services" on public.services for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users delete draft services" on public.services;
create policy "users delete draft services" on public.services for delete to authenticated using (user_id = auth.uid() and status = 'draft');

drop policy if exists "service skills readable" on public.service_skills;
create policy "service skills readable" on public.service_skills for select to anon, authenticated using (
  exists (select 1 from public.services offer where offer.id = service_skills.service_id and (offer.user_id = auth.uid() or offer.status = 'published'))
);
drop policy if exists "users write own service skills" on public.service_skills;
create policy "users write own service skills" on public.service_skills for all to authenticated
using (exists (select 1 from public.services offer where offer.id = service_skills.service_id and offer.user_id = auth.uid()))
with check (exists (select 1 from public.services offer where offer.id = service_skills.service_id and offer.user_id = auth.uid()));

drop policy if exists "service examples readable" on public.service_examples;
create policy "service examples readable" on public.service_examples for select to anon, authenticated using (
  exists (select 1 from public.services offer where offer.id = service_examples.service_id and (offer.user_id = auth.uid() or offer.status = 'published'))
);
drop policy if exists "users write own service examples" on public.service_examples;
create policy "users write own service examples" on public.service_examples for all to authenticated
using (exists (select 1 from public.services offer where offer.id = service_examples.service_id and offer.user_id = auth.uid()))
with check (exists (select 1 from public.services offer where offer.id = service_examples.service_id and offer.user_id = auth.uid()));

drop policy if exists "opportunities readable" on public.opportunities;
create policy "opportunities readable" on public.opportunities for select to anon, authenticated using (
  public.talent_opportunity_visible(auth.uid(), id)
);
drop policy if exists "users insert own opportunities" on public.opportunities;
create policy "users insert own opportunities" on public.opportunities for insert to authenticated with check (client_id = auth.uid());
drop policy if exists "users update own opportunities" on public.opportunities;
create policy "users update own opportunities" on public.opportunities for update to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists "opportunity skills readable" on public.opportunity_skills;
create policy "opportunity skills readable" on public.opportunity_skills for select to anon, authenticated using (
  public.talent_opportunity_visible(auth.uid(), opportunity_id)
);
drop policy if exists "users write own opportunity skills" on public.opportunity_skills;
create policy "users write own opportunity skills" on public.opportunity_skills for all to authenticated
using (exists (select 1 from public.opportunities opp where opp.id = opportunity_skills.opportunity_id and opp.client_id = auth.uid()))
with check (exists (select 1 from public.opportunities opp where opp.id = opportunity_skills.opportunity_id and opp.client_id = auth.uid()));

drop policy if exists "applications readable by parties" on public.applications;
create policy "applications readable by parties" on public.applications for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.opportunities opp where opp.id = applications.opportunity_id and opp.client_id = auth.uid())
);
drop policy if exists "users insert own applications" on public.applications;
create policy "users insert own applications" on public.applications for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "parties update applications" on public.applications;
create policy "parties update applications" on public.applications for update to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.opportunities opp where opp.id = applications.opportunity_id and opp.client_id = auth.uid())
) with check (
  user_id = auth.uid() or exists (select 1 from public.opportunities opp where opp.id = applications.opportunity_id and opp.client_id = auth.uid())
);

drop policy if exists "application works readable by parties" on public.application_works;
create policy "application works readable by parties" on public.application_works for select to authenticated using (
  exists (
    select 1 from public.applications app
    join public.opportunities opp on opp.id = app.opportunity_id
    where app.id = application_works.application_id and (app.user_id = auth.uid() or opp.client_id = auth.uid())
  )
);
drop policy if exists "users write own application works" on public.application_works;
create policy "users write own application works" on public.application_works for all to authenticated
using (exists (select 1 from public.applications app where app.id = application_works.application_id and app.user_id = auth.uid()))
with check (exists (select 1 from public.applications app where app.id = application_works.application_id and app.user_id = auth.uid()));

drop policy if exists "service requests readable by parties" on public.service_requests;
create policy "service requests readable by parties" on public.service_requests for select to authenticated using (
  client_id = auth.uid() or exists (select 1 from public.services offer where offer.id = service_requests.service_id and offer.user_id = auth.uid())
);
drop policy if exists "clients update own requests" on public.service_requests;
create policy "clients update own requests" on public.service_requests for update to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());

drop policy if exists "projects readable by participants" on public.talent_projects;
create policy "projects readable by participants" on public.talent_projects for select to authenticated using (
  auth.uid() in (client_id, provider_id)
);
drop policy if exists "participants update projects" on public.talent_projects;
create policy "participants update projects" on public.talent_projects for update to authenticated
using (auth.uid() in (client_id, provider_id))
with check (auth.uid() in (client_id, provider_id));

drop policy if exists "project events readable by participants" on public.project_events;
create policy "project events readable by participants" on public.project_events for select to authenticated using (
  exists (select 1 from public.talent_projects project where project.id = project_events.project_id and auth.uid() in (project.client_id, project.provider_id))
);
drop policy if exists "participants insert project events" on public.project_events;
create policy "participants insert project events" on public.project_events for insert to authenticated with check (
  actor_id = auth.uid() and exists (
    select 1 from public.talent_projects project where project.id = project_events.project_id and auth.uid() in (project.client_id, project.provider_id)
  )
);

drop policy if exists "deliverables readable by participants" on public.project_deliverables;
create policy "deliverables readable by participants" on public.project_deliverables for select to authenticated using (
  exists (select 1 from public.talent_projects project where project.id = project_deliverables.project_id and auth.uid() in (project.client_id, project.provider_id))
);
drop policy if exists "provider inserts deliverables" on public.project_deliverables;
create policy "provider inserts deliverables" on public.project_deliverables for insert to authenticated with check (
  author_id = auth.uid() and exists (
    select 1 from public.talent_projects project
    where project.id = project_deliverables.project_id and project.provider_id = auth.uid() and project.status in ('active', 'revision')
  )
);

drop policy if exists "messages readable by participants" on public.project_messages;
create policy "messages readable by participants" on public.project_messages for select to authenticated using (
  exists (select 1 from public.talent_projects project where project.id = project_messages.project_id and auth.uid() in (project.client_id, project.provider_id))
);
drop policy if exists "participants insert messages" on public.project_messages;
create policy "participants insert messages" on public.project_messages for insert to authenticated with check (
  author_id = auth.uid() and exists (
    select 1 from public.talent_projects project where project.id = project_messages.project_id and auth.uid() in (project.client_id, project.provider_id)
  )
);

drop policy if exists "amendments readable by participants" on public.project_amendments;
create policy "amendments readable by participants" on public.project_amendments for select to authenticated using (
  exists (select 1 from public.talent_projects project where project.id = project_amendments.project_id and auth.uid() in (project.client_id, project.provider_id))
);
drop policy if exists "participants insert amendments" on public.project_amendments;
create policy "participants insert amendments" on public.project_amendments for insert to authenticated with check (
  author_id = auth.uid() and exists (
    select 1 from public.talent_projects project
    where project.id = project_amendments.project_id and auth.uid() in (project.client_id, project.provider_id) and project.status not in ('done', 'cancelled')
  )
);
drop policy if exists "participants update amendments" on public.project_amendments;
create policy "participants update amendments" on public.project_amendments for update to authenticated using (
  exists (
    select 1 from public.talent_projects project
    where project.id = project_amendments.project_id and auth.uid() in (project.client_id, project.provider_id) and auth.uid() <> project_amendments.author_id
  )
) with check (status in ('accepted', 'rejected'));

drop policy if exists "reviews readable" on public.talent_reviews;
create policy "reviews readable" on public.talent_reviews for select to anon, authenticated using (
  status = 'published' or auth.uid() in (author_id, subject_id)
);
drop policy if exists "participants insert reviews" on public.talent_reviews;
create policy "participants insert reviews" on public.talent_reviews for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "subject replies to review" on public.talent_reviews;
create policy "subject replies to review" on public.talent_reviews for update to authenticated using (subject_id = auth.uid()) with check (subject_id = auth.uid());

drop policy if exists "users read own authorizations" on public.talent_authorizations;
create policy "users read own authorizations" on public.talent_authorizations for select to authenticated using (user_id = auth.uid());
drop policy if exists "users request authorization" on public.talent_authorizations;
create policy "users request authorization" on public.talent_authorizations for insert to authenticated with check (user_id = auth.uid() and status = 'requested');

grant select on public.talent_policy, public.talent_categories, public.skills to anon, authenticated;
grant select on public.talent_profiles, public.talent_profile_categories, public.talent_skills to anon, authenticated;
grant insert, update on public.talent_profiles to authenticated;
grant select, insert, update, delete on public.talent_profile_categories, public.talent_skills to authenticated;
grant select on public.portfolio_items, public.portfolio_skills, public.portfolio_media to anon, authenticated;
grant insert, update, delete on public.portfolio_items, public.portfolio_skills, public.portfolio_media to authenticated;
grant select on public.services, public.service_skills, public.service_examples to anon, authenticated;
grant insert, update, delete on public.services, public.service_skills, public.service_examples to authenticated;
grant select on public.opportunities, public.opportunity_skills to anon, authenticated;
grant insert, update on public.opportunities to authenticated;
grant select, insert, update, delete on public.opportunity_skills to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select, insert, delete on public.application_works to authenticated;
grant select, update on public.service_requests to authenticated;
grant select on public.talent_projects, public.project_events, public.project_deliverables, public.project_messages, public.project_amendments to authenticated;
grant insert on public.project_events, public.project_deliverables, public.project_messages, public.project_amendments to authenticated;
grant update on public.talent_projects, public.project_amendments to authenticated;
grant select on public.talent_reviews to anon, authenticated;
grant insert, update on public.talent_reviews to authenticated;
grant select, insert on public.talent_authorizations to authenticated;

revoke all on public.talent_authorization_notes from anon, authenticated;
revoke all on public.talent_audit from anon, authenticated;
revoke all on function public.talent_notify(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.talent_accept(uuid) from public, anon;
revoke all on function public.talent_request_service(uuid, text) from public, anon;
revoke all on function public.talent_accept_request(uuid) from public, anon;
grant execute on function public.talent_accept(uuid) to authenticated;
grant execute on function public.talent_request_service(uuid, text) to authenticated;
grant execute on function public.talent_accept_request(uuid) to authenticated;
grant execute on function public.talent_apply_block(uuid, uuid) to anon, authenticated;
grant execute on function public.talent_opportunity_visible(uuid, uuid) to anon, authenticated;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%target_type%'
  loop
    execute format('alter table public.reports drop constraint %I', constraint_name);
  end loop;
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.reports'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%status%'
  loop
    execute format('alter table public.reports drop constraint %I', constraint_name);
  end loop;
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%content_type%'
  loop
    execute format('alter table public.notifications drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.reports
  add constraint reports_target_type_check
  check (target_type in ('post', 'comment', 'article', 'photo', 'video', 'profile', 'group', 'editorial', 'talent', 'portfolio', 'service', 'opportunity', 'review', 'talent_project'));

alter table public.reports
  add constraint reports_status_check
  check (status in ('pending', 'reviewed', 'resolved', 'dismissed', 'escalated', 'closed'));

alter table public.notifications
  add constraint notifications_content_type_check
  check (content_type is null or content_type in ('article', 'post', 'project', 'media', 'feed', 'talent'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('talent-files', 'talent-files', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
