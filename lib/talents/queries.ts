import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE } from "@/lib/network/constants";

export const talentPageSize = PAGE_SIZE + 4;

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function numberOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type TalentPerson = {
  userId: string;
  username: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl: string;
  availability: string;
  languages: string[];
  categories: { slug: string; name: string }[];
  updatedAt: string;
};

export type TalentService = {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatarUrl: string;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  offerKind: string;
  deliverables: string;
  priceMode: "indicatif" | "convenir";
  priceCents: number | null;
  currency: string;
  delayDays: number;
  revisions: number;
  prerequisites: string;
  steps: string;
  status: string;
  publishedAt: string;
  coverId: string;
};

export type TalentOpportunity = {
  id: string;
  clientId: string;
  username: string;
  name: string;
  clientKind: string;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  deliverables: string;
  budgetMode: "indicatif" | "discuter";
  budgetCents: number | null;
  currency: string;
  deadline: string;
  durationDays: number;
  seats: number;
  missionType: string;
  conditions: string;
  openToMinors: boolean;
  status: string;
  changeSummary: string;
  publishedAt: string;
};

function mapTalent(row: Row, names: Map<string, { username: string; avatarUrl: string; displayName: string }>, categories: { id: string; name: string; slug: string }[]): TalentPerson {
  const links = Array.isArray(row.talent_profile_categories) ? row.talent_profile_categories : [];
  const name = names.get(text(row.user_id));
  return {
    userId: text(row.user_id),
    username: name?.username ?? "",
    avatarUrl: name?.avatarUrl ?? "",
    name: text(row.display_name),
    title: text(row.title),
    bio: text(row.bio),
    availability: text(row.availability),
    languages: Array.isArray(row.languages) ? row.languages.map((item) => text(item)) : [],
    categories: links.map((item) => {
      const id = text((item as Row).category_id);
      const category = categories.find((entry) => entry.id === id);
      return { slug: category?.slug ?? "", name: category?.name ?? "" };
    }).filter((item) => item.name),
    updatedAt: text(row.updated_at),
  };
}

function mapService(row: Row, names: Map<string, { username: string; avatarUrl: string; displayName: string }>, categories: { id: string; name: string; slug: string }[]): TalentService {
  const name = names.get(text(row.user_id));
  return {
    id: text(row.id),
    userId: text(row.user_id),
    username: name?.username ?? "",
    name: name?.displayName ?? "",
    avatarUrl: name?.avatarUrl ?? "",
    title: text(row.title),
    description: text(row.description),
    category: categoryName(categories, text(row.category_id)),
    categoryId: text(row.category_id),
    offerKind: text(row.offer_kind),
    deliverables: text(row.deliverables),
    priceMode: text(row.price_mode) === "indicatif" ? "indicatif" : "convenir",
    priceCents: numberOrNull(row.price_cents),
    currency: text(row.currency) || "HTG",
    delayDays: Number(row.delay_days) || 0,
    revisions: Number(row.revisions) || 0,
    prerequisites: text(row.prerequisites),
    steps: text(row.steps),
    status: text(row.status),
    publishedAt: text(row.published_at || row.created_at),
    coverId: "",
  };
}

function mapOpportunity(row: Row, names: Map<string, { username: string; avatarUrl: string; displayName: string }>, categories: { id: string; name: string; slug: string }[]): TalentOpportunity {
  const name = names.get(text(row.client_id));
  return {
    id: text(row.id),
    clientId: text(row.client_id),
    username: name?.username ?? "",
    name: name?.displayName ?? "",
    clientKind: text(row.client_kind),
    title: text(row.title),
    description: text(row.description),
    category: categoryName(categories, text(row.category_id)),
    categoryId: text(row.category_id),
    deliverables: text(row.deliverables),
    budgetMode: text(row.budget_mode) === "indicatif" ? "indicatif" : "discuter",
    budgetCents: numberOrNull(row.budget_cents),
    currency: text(row.currency) || "HTG",
    deadline: text(row.deadline),
    durationDays: Number(row.duration_days) || 0,
    seats: Number(row.seats) || 1,
    missionType: text(row.mission_type),
    conditions: text(row.conditions),
    openToMinors: row.open_to_minors === true,
    status: text(row.status),
    changeSummary: text(row.last_change_summary),
    publishedAt: text(row.published_at || row.created_at),
  };
}

const talentSelect = "user_id, display_name, title, bio, availability, languages, status, show_public, moderation_hold, updated_at, talent_profile_categories(category_id)";
const serviceSelect = "id, user_id, title, description, category_id, offer_kind, deliverables, price_mode, price_cents, currency, delay_days, revisions, prerequisites, steps, status, moderation_hold, published_at, created_at";
const opportunitySelect = "id, client_id, client_kind, title, description, category_id, deliverables, budget_mode, budget_cents, currency, deadline, duration_days, seats, mission_type, conditions, open_to_minors, status, moderation_hold, last_change_summary, published_at, created_at";

async function namesFor(userIds: string[]) {
  const supabase = await createClient();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!supabase || ids.length === 0) return new Map<string, { username: string; avatarUrl: string; displayName: string }>();
  const { data } = await supabase.from("profiles").select("id, username, avatar_url, display_name").in("id", ids);
  return new Map((data ?? []).map((row) => [text(row.id), { username: text(row.username), avatarUrl: text(row.avatar_url), displayName: text(row.display_name) }]));
}

function categoryName(categories: { id: string; name: string; slug: string }[], id: string) {
  return categories.find((item) => item.id === id)?.name ?? "";
}

export async function talentReader() {
  return createClient();
}

export type TalentCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
  parentId: string;
  icon: string;
};

export async function loadCategories() {
  const supabase = await createClient();
  if (!supabase) return [] as TalentCategory[];
  const { data } = await supabase.from("talent_categories").select("id, slug, name, description, sort_order, active, parent_id, icon").order("sort_order");
  return (data ?? []).map((row) => ({
    id: text(row.id),
    slug: text(row.slug),
    name: text(row.name),
    description: text(row.description),
    sortOrder: Number(row.sort_order) || 0,
    active: row.active === true,
    parentId: text(row.parent_id),
    icon: text(row.icon),
  }));
}

export function categoryTree(categories: TalentCategory[]) {
  const active = categories.filter((item) => item.active);
  return active
    .filter((item) => !item.parentId)
    .map((parent) => ({
      parent,
      children: active.filter((item) => item.parentId === parent.id),
    }));
}

export async function searchMarket(kind: "service" | "talent" | "projet" | "categorie", query: string, category = "", maxCents: number | null = null, maxDelay: number | null = null) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("talent_search_ids", {
    kind,
    query: query.slice(0, 40),
    category_slug: category,
    max_cents: maxCents,
    max_delay: maxDelay,
  });
  if (error || !data) return [];
  const ids = (data as { id: string }[]).map((row) => row.id).filter(Boolean);
  if (ids.length === 0) return [];
  if (kind === "service") {
    const { data: rows } = await supabase.from("services").select(serviceSelect).in("id", ids);
    return decorateServices((rows ?? []) as Row[]);
  }
  if (kind === "talent") {
    const { data: rows } = await supabase.from("talent_profiles").select(talentSelect).in("user_id", ids);
    return decorateTalents((rows ?? []) as Row[]);
  }
  if (kind === "projet") {
    const { data: rows } = await supabase.from("opportunities").select(opportunitySelect).in("id", ids);
    return decorateOpportunities((rows ?? []) as Row[]);
  }
  const categories = await loadCategories();
  return categories.filter((item) => ids.includes(item.id));
}

export async function loadSkills() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("skills").select("id, category_id, name, description, active").eq("active", true).order("name");
  return (data ?? []).map((row) => ({
    id: text(row.id),
    categoryId: text(row.category_id),
    name: text(row.name),
    description: text(row.description),
  }));
}

export async function loadPolicy() {
  const supabase = await createClient();
  if (!supabase) return { paidMinorsEnabled: false, orgOffersEnabled: false };
  const { data } = await supabase.from("talent_policy").select("paid_minors_enabled, org_offers_enabled").eq("id", 1).maybeSingle();
  return {
    paidMinorsEnabled: data?.paid_minors_enabled === true,
    orgOffersEnabled: data?.org_offers_enabled === true,
  };
}

async function decorateTalents(rows: Row[]) {
  const categories = await loadCategories();
  const names = await namesFor(rows.map((row) => text(row.user_id)));
  return rows.map((row) => mapTalent(row, names, categories));
}

async function decorateServices(rows: Row[]) {
  const categories = await loadCategories();
  const names = await namesFor(rows.map((row) => text(row.user_id)));
  const services = rows.map((row) => mapService(row, names, categories));
  const supabase = await createClient();
  const ids = services.map((item) => item.id).filter(Boolean);
  if (!supabase || ids.length === 0) return services;
  const { data } = await supabase.from("service_media").select("id, service_id").in("service_id", ids).order("sort_order");
  const covers = new Map<string, string>();
  for (const row of data ?? []) if (!covers.has(text(row.service_id))) covers.set(text(row.service_id), text(row.id));
  return services.map((item) => ({ ...item, coverId: covers.get(item.id) ?? "" }));
}

async function decorateOpportunities(rows: Row[]) {
  const categories = await loadCategories();
  const names = await namesFor(rows.map((row) => text(row.client_id)));
  return rows.map((row) => mapOpportunity(row, names, categories));
}

export async function loadTalentDirectory(page: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const from = page * talentPageSize;
  const { data } = await supabase
    .from("talent_profiles")
    .select(talentSelect)
    .eq("status", "published")
    .eq("show_public", true)
    .order("updated_at", { ascending: false })
    .range(from, from + talentPageSize - 1);
  return decorateTalents((data ?? []) as Row[]);
}

export async function loadServices(page: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const from = page * talentPageSize;
  const { data } = await supabase
    .from("services")
    .select(serviceSelect)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, from + talentPageSize - 1);
  return decorateServices((data ?? []) as Row[]);
}

export async function loadOpportunities(page: number) {
  const supabase = await createClient();
  if (!supabase) return [];
  const from = page * talentPageSize;
  const { data } = await supabase
    .from("opportunities")
    .select(opportunitySelect)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(from, from + talentPageSize - 1);
  return decorateOpportunities((data ?? []) as Row[]);
}

export async function loadTalentByUsername(username: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!profile?.id) return null;
  const { data } = await supabase.from("talent_profiles").select(talentSelect).eq("user_id", profile.id).maybeSingle();
  if (!data) return null;
  const person = (await decorateTalents([data as Row]))[0];
  const [{ data: skills }, { data: portfolio }, { data: services }, { data: reviews }] = await Promise.all([
    supabase.from("talent_skills").select("level, skills(name)").eq("user_id", profile.id),
    supabase.from("portfolio_items").select("id, title, description, origin, period_label, role_label, external_url, status, sort_order").eq("user_id", profile.id).order("sort_order"),
    supabase.from("services").select(serviceSelect).eq("user_id", profile.id).order("updated_at", { ascending: false }),
    supabase.from("talent_reviews").select("id, rating, body, reply, created_at, status").eq("subject_id", profile.id).eq("status", "published").order("created_at", { ascending: false }).limit(12),
  ]);
  return {
    person,
    skills: (skills ?? []).map((row) => {
      const skill = (Array.isArray(row.skills) ? row.skills[0] : row.skills) as Row | null;
      return { name: text(skill?.name), level: text(row.level) };
    }),
    portfolio: (portfolio ?? []).map((row) => ({
      id: text(row.id),
      title: text(row.title),
      description: text(row.description),
      origin: text(row.origin),
      period: text(row.period_label),
      role: text(row.role_label),
      url: text(row.external_url),
      status: text(row.status),
    })),
    services: await decorateServices((services ?? []) as Row[]),
    reviews: (reviews ?? []).map((row) => ({
      id: text(row.id),
      rating: Number(row.rating) || 0,
      body: text(row.body),
      reply: text(row.reply),
      createdAt: text(row.created_at),
    })),
  };
}

export async function searchTalents(query: { q?: string; categorie?: string; dispo?: string; langue?: string; page?: number }) {
  const supabase = await createClient();
  if (!supabase) return [];
  const safeQuery = (query.q ?? "").replace(/[^a-zA-Z0-9À-ÿ '-]/g, "").slice(0, 40);
  let request = supabase.from("talent_profiles").select(talentSelect).eq("status", "published").eq("show_public", true);
  if (query.dispo) request = request.eq("availability", query.dispo);
  if (query.langue) request = request.contains("languages", [query.langue]);
  if (safeQuery) request = request.or(`display_name.ilike.%${safeQuery}%,title.ilike.%${safeQuery}%`);
  const from = (query.page ?? 0) * talentPageSize;
  const { data } = await request.order("updated_at", { ascending: false }).range(from, from + talentPageSize - 1);
  let rows = await decorateTalents((data ?? []) as Row[]);
  if (query.categorie) rows = rows.filter((row) => row.categories.some((item) => item.slug === query.categorie));
  if (safeQuery) {
    const needle = safeQuery.toLowerCase();
    rows = rows.filter((row) => `${row.name} ${row.username} ${row.title} ${row.bio}`.toLowerCase().includes(needle));
  }
  return rows;
}

export async function searchServices(query: { q?: string; categorie?: string; type?: string; prixMin?: string; prixMax?: string; page?: number }) {
  const supabase = await createClient();
  if (!supabase) return [];
  const categories = await loadCategories();
  const categoryId = categories.find((item) => item.slug === query.categorie)?.id;
  let request = supabase.from("services").select(serviceSelect).eq("status", "published");
  if (categoryId) request = request.eq("category_id", categoryId);
  if (query.type) request = request.eq("offer_kind", query.type);
  const min = Number(query.prixMin);
  const max = Number(query.prixMax);
  if (Number.isFinite(min) && min > 0) request = request.gte("price_cents", Math.round(min * 100));
  if (Number.isFinite(max) && max > 0) request = request.lte("price_cents", Math.round(max * 100));
  const from = (query.page ?? 0) * talentPageSize;
  const { data } = await request.order("published_at", { ascending: false }).range(from, from + talentPageSize - 1);
  let rows = await decorateServices((data ?? []) as Row[]);
  const needle = (query.q ?? "").trim().toLowerCase();
  if (needle) rows = rows.filter((row) => `${row.title} ${row.description} ${row.name} ${row.username}`.toLowerCase().includes(needle));
  return rows;
}

export async function searchOpportunities(query: { q?: string; categorie?: string; mission?: string; page?: number }) {
  const supabase = await createClient();
  if (!supabase) return [];
  const categories = await loadCategories();
  const categoryId = categories.find((item) => item.slug === query.categorie)?.id;
  let request = supabase.from("opportunities").select(opportunitySelect).eq("status", "published");
  if (categoryId) request = request.eq("category_id", categoryId);
  if (query.mission) request = request.eq("mission_type", query.mission);
  const from = (query.page ?? 0) * talentPageSize;
  const { data } = await request.order("published_at", { ascending: false }).range(from, from + talentPageSize - 1);
  let rows = await decorateOpportunities((data ?? []) as Row[]);
  const needle = (query.q ?? "").trim().toLowerCase();
  if (needle) rows = rows.filter((row) => `${row.title} ${row.description} ${row.name}`.toLowerCase().includes(needle));
  return rows;
}

export async function loadService(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("services").select(serviceSelect).eq("id", id).maybeSingle();
  if (!data) return null;
  return (await decorateServices([data as Row]))[0] ?? null;
}

export async function loadOfferDetails(serviceId: string) {
  const supabase = await createClient();
  if (!supabase) return { packages: [], addons: [], media: [] };
  const [{ data: packages }, { data: addons }, { data: media }] = await Promise.all([
    supabase.from("service_packages").select("id, tier, title, description, price_mode, price_cents, currency, delay_days, revisions, includes, active").eq("service_id", serviceId).eq("active", true).order("sort_order"),
    supabase.from("service_addons").select("id, title, price_cents, currency, active").eq("service_id", serviceId).eq("active", true),
    supabase.from("service_media").select("id, alt_text, sort_order").eq("service_id", serviceId).order("sort_order"),
  ]);
  return {
    packages: (packages ?? []).map((row) => ({
      id: text(row.id),
      tier: text(row.tier),
      title: text(row.title),
      description: text(row.description),
      priceMode: text(row.price_mode) === "indicatif" ? "indicatif" as const : "convenir" as const,
      priceCents: numberOrNull(row.price_cents),
      currency: text(row.currency) || "HTG",
      delayDays: Number(row.delay_days) || 0,
      revisions: Number(row.revisions) || 0,
      includes: text(row.includes),
    })),
    addons: (addons ?? []).map((row) => ({
      id: text(row.id),
      title: text(row.title),
      priceCents: Number(row.price_cents) || 0,
      currency: text(row.currency) || "HTG",
    })),
    media: (media ?? []).map((row) => ({ id: text(row.id), alt: text(row.alt_text) })),
  };
}

export async function loadOpportunity(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("opportunities").select(opportunitySelect).eq("id", id).maybeSingle();
  if (!data) return null;
  return (await decorateOpportunities([data as Row]))[0] ?? null;
}
