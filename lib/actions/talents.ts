"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extensionFor, imageKind } from "@/lib/network/media";
import { isExplicit } from "@/lib/network/safety";
import { ensureProfile } from "@/lib/social/queries";
import { createClient } from "@/lib/supabase/server";
import { talentError } from "@/lib/talents/copy";
import { deleteTalentFile, stripJpegExif, uploadTalentFile } from "@/lib/talents/files";
import { containsOffPlatform, containsPrivateContact, opportunityPublishStatus, profileProgress } from "@/lib/talents/rules";

type Result = { error?: string; auth?: boolean };

async function session() {
  const supabase = await createClient();
  if (!supabase) return { error: "Talents n'est pas disponible." } as const;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { auth: true, supabase } as const;
  await ensureProfile(supabase, data.user.id);
  const { data: profile } = await supabase.from("profiles").select("suspended_at, age_band, display_name").eq("id", data.user.id).maybeSingle();
  if (profile?.suspended_at) return { error: "Ce compte est suspendu." } as const;
  return { supabase, userId: data.user.id, ageBand: profile?.age_band || "unknown", displayName: profile?.display_name || "" };
}

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function blocked(value: string) {
  return isExplicit(value) || containsPrivateContact(value) || containsOffPlatform(value);
}

function fail(error: { message?: string } | null, fallback: string): Result {
  if (!error) return {};
  return { error: talentError(error.message, fallback) };
}

function ids(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name).map((value) => String(value)))].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 8);
}

function money(formData: FormData, mode: string) {
  if (mode === "convenir" || mode === "discuter") return { cents: null as number | null };
  const amount = Number(String(formData.get("price") ?? "").trim().replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return { error: "Indiquez un montant indicatif, ou choisissez un prix à convenir." };
  return { cents: Math.round(amount * 100) };
}

function packageForm(formData: FormData, prefix: string) {
  const next = new FormData();
  next.set("price", String(formData.get(`${prefix}-price`) ?? ""));
  return next;
}

function refresh(path: string) {
  revalidatePath("/talents");
  revalidatePath(path);
}

export async function saveTalentProfile(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const name = clean(formData.get("name"), 40);
  const title = clean(formData.get("title"), 80);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 500);
  const availability = String(formData.get("availability") ?? "");
  const languages = [...new Set(formData.getAll("languages").map(String))].filter((code) => ["fr", "en", "es", "ht", "pt"].includes(code)).slice(0, 5);
  const publish = formData.get("publish") === "oui";
  if (name.length < 2) return { error: "Indiquez un nom professionnel ou un pseudonyme." };
  if (!["", "disponible", "limitee", "indisponible"].includes(availability)) return { error: "Choisissez une disponibilité." };
  if (blocked(`${name} ${title} ${bio}`)) return { error: talentError("contenu", "Ce texte n'est pas autorisé.") };
  const categories = ids(formData, "categories");
  const skillIds = ids(formData, "skills");
  const progress = profileProgress({ name, title, bio, categories: categories.length, skills: skillIds.length, availability, languages: languages.length });
  if (publish && progress.missing.length > 0) return { error: `Avant de publier la vitrine, ajoutez ${progress.missing[0]}.` };
  const row = {
    user_id: current.userId,
    display_name: name,
    title,
    bio,
    availability,
    languages,
    status: publish ? "published" : "draft",
    show_public: publish,
  };
  const existing = await current.supabase.from("talent_profiles").select("user_id").eq("user_id", current.userId).maybeSingle();
  const saved = existing.data
    ? await current.supabase.from("talent_profiles").update(row).eq("user_id", current.userId)
    : await current.supabase.from("talent_profiles").insert(row);
  if (saved.error) return fail(saved.error, "Le profil n'a pas pu être enregistré.");
  await current.supabase.from("talent_profile_categories").delete().eq("user_id", current.userId);
  if (categories.length > 0) {
    const inserted = await current.supabase.from("talent_profile_categories").insert(categories.map((categoryId) => ({ user_id: current.userId, category_id: categoryId })));
    if (inserted.error) return fail(inserted.error, "Les catégories n'ont pas pu être enregistrées.");
  }
  await current.supabase.from("talent_skills").delete().eq("user_id", current.userId);
  if (skillIds.length > 0) {
    const inserted = await current.supabase.from("talent_skills").insert(skillIds.map((skillId) => {
      const level = String(formData.get(`level-${skillId}`) ?? "");
      return {
        user_id: current.userId,
        skill_id: skillId,
        level: ["decouverte", "pratique", "aise", "avance"].includes(level) ? level : "decouverte",
      };
    }));
    if (inserted.error) return fail(inserted.error, "Les compétences n'ont pas pu être enregistrées.");
  }
  refresh("/talents/moi");
  redirect("/talents/moi?etat=profil");
}

export async function savePortfolio(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const title = clean(formData.get("title"), 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000);
  const origin = String(formData.get("origin") ?? "");
  const role = clean(formData.get("role"), 80);
  const period = clean(formData.get("period"), 40);
  const external = clean(formData.get("url"), 200);
  const status = String(formData.get("status") ?? "draft");
  const category = String(formData.get("category") ?? "");
  if (title.length < 2) return { error: "Le titre est trop court." };
  if (!["personnel", "educatif", "client", "equipe", "exercice"].includes(origin)) return { error: "Indiquez le cadre du projet." };
  if (!["draft", "published", "archived"].includes(status)) return { error: "Statut inconnu." };
  if (external && !external.startsWith("https://")) return { error: "Le lien doit commencer par https://." };
  if (blocked(`${title} ${description} ${role}`)) return { error: talentError("contenu", "Ce texte n'est pas autorisé.") };
  const row = {
    user_id: current.userId,
    title,
    description,
    category_id: /^[0-9a-f-]{36}$/i.test(category) ? category : null,
    role_label: role,
    origin,
    period_label: period,
    external_url: external,
    status,
  };
  const saved = /^[0-9a-f-]{36}$/i.test(id)
    ? await current.supabase.from("portfolio_items").update(row).eq("id", id).eq("user_id", current.userId).select("id").maybeSingle()
    : await current.supabase.from("portfolio_items").insert(row).select("id").single();
  if (saved.error || !saved.data) return fail(saved.error, "La réalisation n'a pas pu être enregistrée.");
  const itemId = saved.data.id as string;
  await current.supabase.from("portfolio_skills").delete().eq("item_id", itemId);
  const skillIds = ids(formData, "skills");
  if (skillIds.length > 0) await current.supabase.from("portfolio_skills").insert(skillIds.map((skillId) => ({ item_id: itemId, skill_id: skillId })));
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > 8_388_608) return { error: "L'image doit faire moins de 8 Mo." };
    const body = Buffer.from(await file.arrayBuffer());
    const mime = imageKind(body);
    if (!mime) return { error: "Utilisez une image JPEG, PNG ou WebP." };
    const prepared = mime === "image/jpeg" ? stripJpegExif(body) : body;
    const path = `${current.userId}/${crypto.randomUUID()}.${extensionFor(mime)}`;
    try {
      await uploadTalentFile(path, prepared, mime);
    } catch {
      return { error: "L'image n'a pas pu être envoyée." };
    }
    const media = await current.supabase.from("portfolio_media").insert({ item_id: itemId, storage_path: path, mime_type: mime, file_size: prepared.length });
    if (media.error) {
      await deleteTalentFile(path);
      return fail(media.error, "L'image n'a pas pu être reliée à la réalisation.");
    }
  }
  refresh(`/talents/portfolio/${itemId}`);
  redirect(`/talents/moi/portfolio/${itemId}?etat=enregistre`);
}

export async function deletePortfolio(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  if (formData.get("confirm") !== "supprimer") return { error: "Écrivez supprimer pour confirmer." };
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Réalisation inconnue." };
  const { data: media } = await current.supabase.from("portfolio_media").select("storage_path").eq("item_id", id);
  const removed = await current.supabase.from("portfolio_items").delete().eq("id", id).eq("user_id", current.userId);
  if (removed.error) return { error: "Cette réalisation est encore utilisée par un service ou une candidature." };
  for (const item of media ?? []) await deleteTalentFile(String(item.storage_path));
  refresh("/talents/moi");
  redirect("/talents/moi?espace=portfolio");
}

export async function saveService(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const title = clean(formData.get("title"), 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 4000);
  const deliverables = clean(formData.get("deliverables"), 500);
  const prerequisites = clean(formData.get("prerequisites"), 500);
  const offerKind = String(formData.get("offerKind") ?? "");
  const priceMode = String(formData.get("priceMode") ?? "");
  const currency = String(formData.get("currency") ?? "HTG");
  const delay = Number(formData.get("delay"));
  const revisions = Number(formData.get("revisions") ?? 0);
  const category = String(formData.get("category") ?? "");
  const status = String(formData.get("status") ?? "draft");
  if (title.length < 3 || description.length < 20 || deliverables.length < 2) return { error: "Décrivez le service, son résultat et ses livrables." };
  if (!["creation", "cours", "conseil", "assistance", "autre"].includes(offerKind)) return { error: "Choisissez un type de prestation." };
  if (!["indicatif", "convenir"].includes(priceMode) || !["HTG", "USD"].includes(currency)) return { error: "Le prix indicatif est incomplet." };
  if (!Number.isInteger(delay) || delay < 1 || delay > 365) return { error: "Indiquez un délai entre 1 et 365 jours." };
  if (!Number.isInteger(revisions) || revisions < 0 || revisions > 20) return { error: "Le nombre de révisions n'est pas valide." };
  if (!["draft", "published", "archived"].includes(status)) return { error: "Statut inconnu." };
  if (blocked(`${title} ${description} ${deliverables} ${prerequisites} ${String(formData.get("steps") ?? "")}`)) return { error: talentError("contenu", "Ce texte n'est pas autorisé.") };
  const price = money(formData, priceMode);
  if ("error" in price) return { error: price.error };
  const row = {
    user_id: current.userId,
    title,
    description,
    category_id: category,
    offer_kind: offerKind,
    deliverables,
    price_mode: priceMode,
    price_cents: price.cents,
    currency,
    delay_days: delay,
    revisions,
    prerequisites,
    steps: clean(formData.get("steps"), 1000),
    status,
  };
  const saved = /^[0-9a-f-]{36}$/i.test(id)
    ? await current.supabase.from("services").update(row).eq("id", id).eq("user_id", current.userId).select("id").maybeSingle()
    : await current.supabase.from("services").insert(row).select("id").single();
  if (saved.error || !saved.data) return fail(saved.error, "Le service n'a pas pu être enregistré.");
  const serviceId = saved.data.id as string;
  await current.supabase.from("service_skills").delete().eq("service_id", serviceId);
  const skillIds = ids(formData, "skills");
  if (skillIds.length > 0) await current.supabase.from("service_skills").insert(skillIds.map((skillId) => ({ service_id: serviceId, skill_id: skillId })));
  for (const [index, tier] of ["basique", "standard", "premium"].entries()) {
    const packageTitle = clean(formData.get(`${tier}-title`), 40);
    if (packageTitle.length < 2) {
      await current.supabase.from("service_packages").delete().eq("service_id", serviceId).eq("tier", tier);
      continue;
    }
    const packageMode = String(formData.get(`${tier}-mode`) ?? "indicatif");
    const packageCurrency = String(formData.get(`${tier}-currency`) ?? currency);
    if (!["indicatif", "convenir"].includes(packageMode) || !["HTG", "USD"].includes(packageCurrency)) return { error: "Une formule a une devise ou un mode de prix invalide." };
    const packagePrice = money(packageForm(formData, tier), packageMode);
    if ("error" in packagePrice) return { error: packagePrice.error };
    const packageDelay = Number(formData.get(`${tier}-delay`) ?? delay);
    const packageRevisions = Number(formData.get(`${tier}-revisions`) ?? revisions);
    if (!Number.isInteger(packageDelay) || packageDelay < 1 || packageDelay > 365) return { error: "Le délai d'une formule est invalide." };
    const savedPackage = {
      service_id: serviceId,
      tier,
      title: packageTitle,
      description: clean(formData.get(`${tier}-description`), 280),
      price_mode: packageMode,
      price_cents: packagePrice.cents,
      currency: packageCurrency,
      delay_days: packageDelay,
      revisions: Number.isInteger(packageRevisions) ? Math.min(Math.max(packageRevisions, 0), 20) : 0,
      includes: clean(formData.get(`${tier}-includes`), 500),
      active: true,
      sort_order: index,
    };
    if (blocked(`${savedPackage.title} ${savedPackage.description} ${savedPackage.includes}`)) return { error: talentError("contenu", "Ce texte n'est pas autorisé.") };
    const existing = await current.supabase.from("service_packages").select("id").eq("service_id", serviceId).eq("tier", tier).maybeSingle();
    const written = existing.data
      ? await current.supabase.from("service_packages").update(savedPackage).eq("id", existing.data.id)
      : await current.supabase.from("service_packages").insert(savedPackage);
    if (written.error) return fail(written.error, "Une formule n'a pas pu être enregistrée.");
  }
  const addonTitle = clean(formData.get("addon-title"), 60);
  if (addonTitle.length >= 2) {
    const addonPrice = money(packageForm(formData, "addon"), "indicatif");
    if ("error" in addonPrice || addonPrice.cents == null) return { error: "Indiquez le prix indicatif de l'option." };
    if (!["HTG", "USD"].includes(String(formData.get("addon-currency") ?? currency))) return { error: "Devise d'option inconnue." };
    const addon = await current.supabase.from("service_addons").insert({
      service_id: serviceId,
      title: addonTitle,
      price_cents: addonPrice.cents,
      currency: String(formData.get("addon-currency") ?? currency),
      active: true,
    });
    if (addon.error) return fail(addon.error, "L'option n'a pas pu être enregistrée.");
  }
  const image = formData.get("image");
  const alt = clean(formData.get("alt"), 120);
  if (image instanceof File && image.size > 0) {
    if (image.size > 8_388_608) return { error: "L'image doit faire moins de 8 Mo." };
    const body = Buffer.from(await image.arrayBuffer());
    const mime = imageKind(body);
    if (!mime) return { error: "Utilisez une image JPEG, PNG ou WebP." };
    const prepared = mime === "image/jpeg" ? stripJpegExif(body) : body;
    const path = `${current.userId}/${crypto.randomUUID()}.${extensionFor(mime)}`;
    try {
      await uploadTalentFile(path, prepared, mime);
    } catch {
      return { error: "L'image n'a pas pu être envoyée." };
    }
    const media = await current.supabase.from("service_media").insert({
      service_id: serviceId,
      storage_path: path,
      mime_type: mime,
      file_size: prepared.length,
      alt_text: alt || title,
      sort_order: 0,
    });
    if (media.error) {
      await deleteTalentFile(path);
      return fail(media.error, "L'image n'a pas pu être reliée au service.");
    }
  }
  refresh(`/talents/services/${serviceId}`);
  redirect(`/talents/services/${serviceId}`);
}

export async function saveOpportunity(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const title = clean(formData.get("title"), 80);
  const description = String(formData.get("description") ?? "").trim().slice(0, 4000);
  const deliverables = clean(formData.get("deliverables"), 500);
  const conditions = clean(formData.get("conditions"), 500);
  const clientKind = String(formData.get("clientKind") ?? "membre");
  const missionType = String(formData.get("missionType") ?? "");
  const budgetMode = String(formData.get("budgetMode") ?? "");
  const currency = String(formData.get("currency") ?? "HTG");
  const duration = Number(formData.get("duration"));
  const seats = Number(formData.get("seats") ?? 1);
  const category = String(formData.get("category") ?? "");
  const deadline = String(formData.get("deadline") ?? "");
  const openToMinors = formData.get("openToMinors") === "oui";
  const status = String(formData.get("status") ?? "draft");
  if (title.length < 3 || description.length < 20 || deliverables.length < 2) return { error: "Décrivez le besoin et les livrables attendus." };
  if (!["membre", "particulier", "association", "entreprise"].includes(clientKind)) return { error: "Indiquez qui publie le besoin." };
  if (!["educatif", "creatif", "benevole", "remuneree", "associatif", "concours", "personnel"].includes(missionType)) return { error: "Choisissez un type de mission." };
  if (!["indicatif", "discuter"].includes(budgetMode) || !["HTG", "USD"].includes(currency)) return { error: "Le budget indicatif est incomplet." };
  if (!Number.isInteger(duration) || duration < 1 || duration > 365 || !Number.isInteger(seats) || seats < 1 || seats > 10) return { error: "Le délai ou le nombre de places est invalide." };
  if (!["draft", "published", "closed", "archived"].includes(status)) return { error: "Statut inconnu." };
  if (blocked(`${title} ${description} ${deliverables} ${conditions}`)) return { error: talentError("contenu", "Ce texte n'est pas autorisé.") };
  const price = money(formData, budgetMode === "discuter" ? "discuter" : budgetMode);
  if ("error" in price) return { error: price.error };
  const decision = opportunityPublishStatus({
    clientKind,
    openToMinors,
    orgOffersEnabled: false,
    missionType,
    budgetMode,
    budgetCents: price.cents,
  });
  if (decision.error) return { error: decision.error };
  const { data: policy } = await current.supabase.from("talent_policy").select("org_offers_enabled").eq("id", 1).maybeSingle();
  const orgOpen = policy?.org_offers_enabled === true;
  let nextStatus = status;
  if (status === "published" && (clientKind === "association" || clientKind === "entreprise") && openToMinors && !orgOpen) nextStatus = "pending";
  const row = {
    client_id: current.userId,
    client_kind: clientKind,
    title,
    description,
    category_id: category,
    deliverables,
    budget_mode: budgetMode,
    budget_cents: price.cents,
    currency,
    deadline: deadline || null,
    duration_days: duration,
    seats,
    mission_type: missionType,
    conditions,
    open_to_minors: openToMinors,
    status: nextStatus,
  };
  const saved = /^[0-9a-f-]{36}$/i.test(id)
    ? await current.supabase.from("opportunities").update(row).eq("id", id).eq("client_id", current.userId).select("id, status").maybeSingle()
    : await current.supabase.from("opportunities").insert(row).select("id, status").single();
  if (saved.error || !saved.data) return fail(saved.error, "La mission n'a pas pu être enregistrée.");
  const opportunityId = saved.data.id as string;
  await current.supabase.from("opportunity_skills").delete().eq("opportunity_id", opportunityId);
  const skillIds = ids(formData, "skills");
  if (skillIds.length > 0) await current.supabase.from("opportunity_skills").insert(skillIds.map((skillId) => ({ opportunity_id: opportunityId, skill_id: skillId })));
  refresh(`/talents/opportunites/${opportunityId}`);
  redirect(saved.data.status === "pending" ? `/talents/opportunites/${opportunityId}?etat=verification` : `/talents/opportunites/${opportunityId}`);
}

export async function sendApplication(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const opportunityId = String(formData.get("opportunity") ?? "");
  const pitch = String(formData.get("pitch") ?? "").trim().slice(0, 2000);
  const question = clean(formData.get("question"), 500);
  const priceMode = String(formData.get("priceMode") ?? "convenir");
  const delay = Number(formData.get("delay") || 0);
  if (!/^[0-9a-f-]{36}$/i.test(opportunityId) || pitch.length < 20) return { error: "Présentez votre proposition en quelques phrases." };
  if (blocked(`${pitch} ${question}`)) return { error: talentError("contenu", "Ce texte n'est pas autorisé.") };
  const price = money(formData, priceMode);
  if ("error" in price) return { error: price.error };
  const row = {
    opportunity_id: opportunityId,
    user_id: current.userId,
    pitch,
    question,
    delay_days: delay >= 1 && delay <= 365 ? delay : null,
    price_mode: priceMode === "indicatif" ? "indicatif" : "convenir",
    price_cents: price.cents,
    status: "sent",
  };
  const existing = await current.supabase.from("applications").select("id, status").eq("opportunity_id", opportunityId).eq("user_id", current.userId).maybeSingle();
  const saved = existing.data
    ? await current.supabase.from("applications").update(row).eq("id", existing.data.id).select("id").single()
    : await current.supabase.from("applications").insert(row).select("id").single();
  if (saved.error || !saved.data) return fail(saved.error, "La candidature n'a pas pu être envoyée.");
  const applicationId = saved.data.id as string;
  await current.supabase.from("application_works").delete().eq("application_id", applicationId);
  const works = ids(formData, "works");
  if (works.length > 0) await current.supabase.from("application_works").insert(works.map((itemId) => ({ application_id: applicationId, item_id: itemId })));
  refresh(`/talents/opportunites/${opportunityId}`);
  redirect("/talents/moi/candidatures?etat=envoyee");
}

export async function setApplicationStatus(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Candidature inconnue." };
  if (status === "accepted") {
    const { data, error } = await current.supabase.rpc("talent_accept", { application_id: id });
    if (error) return fail(error, "La candidature n'a pas pu être acceptée.");
    refresh(`/talents/moi/projets/${data}`);
    redirect(`/talents/moi/projets/${data}`);
  }
  const saved = await current.supabase.from("applications").update({ status }).eq("id", id);
  if (saved.error) return fail(saved.error, "Le statut n'a pas pu être modifié.");
  refresh("/talents/moi/candidatures");
  return {};
}

export async function requestService(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const serviceId = String(formData.get("service") ?? "");
  const note = String(formData.get("message") ?? "").trim().slice(0, 1000);
  if (!/^[0-9a-f-]{36}$/i.test(serviceId) || note.length < 2) return { error: "Expliquez votre demande." };
  const { error } = await current.supabase.rpc("talent_request_service", { service_id: serviceId, note });
  if (error) return fail(error, "La demande n'a pas pu être envoyée.");
  refresh(`/talents/services/${serviceId}`);
  redirect("/talents/moi/projets?etat=demande");
}

export async function acceptServiceRequest(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const { data, error } = await current.supabase.rpc("talent_accept_request", { request_id: id });
  if (error) return fail(error, "La demande n'a pas pu être acceptée.");
  redirect(`/talents/moi/projets/${data}`);
}

export async function moveProject(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = clean(formData.get("note"), 280);
  if (status === "cancel-request") {
    const request = await current.supabase.from("talent_projects").update({ cancellation_requested_by: current.userId, cancellation_reason: note }).eq("id", id);
    if (request.error) return fail(request.error, "La demande d'annulation a échoué.");
    await current.supabase.from("project_events").insert({ project_id: id, actor_id: current.userId, kind: "cancel_request", note });
    refresh(`/talents/moi/projets/${id}`);
    return {};
  }
  const saved = await current.supabase.from("talent_projects").update({ status }).eq("id", id);
  if (saved.error) return fail(saved.error, "Le projet n'a pas pu changer d'étape.");
  await current.supabase.from("project_events").insert({ project_id: id, actor_id: current.userId, kind: status, note });
  refresh(`/talents/moi/projets/${id}`);
  return {};
}

export async function sendProjectMessage(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000);
  if (!body) return { error: "Écrivez un message." };
  const saved = await current.supabase.from("project_messages").insert({ project_id: id, author_id: current.userId, body });
  if (saved.error) return fail(saved.error, "Le message n'a pas pu être envoyé.");
  refresh(`/talents/moi/projets/${id}`);
  return {};
}

export async function submitDeliverable(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  const external = clean(formData.get("url"), 200);
  if (external && !external.startsWith("https://")) return { error: "Le lien doit commencer par https://." };
  if (blocked(`${comment} ${external}`)) return { error: talentError("contenu", "Ce texte n'est pas autorisé.") };
  const { data: existing } = await current.supabase.from("project_deliverables").select("version").eq("project_id", id).order("version", { ascending: false }).limit(1);
  const version = (Number(existing?.[0]?.version) || 0) + 1;
  let storagePath = "";
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > 8_388_608) return { error: "Le fichier doit faire moins de 8 Mo." };
    const body = Buffer.from(await file.arrayBuffer());
    const mime = imageKind(body) || (body.subarray(0, 4).toString("ascii") === "%PDF" ? "application/pdf" : null);
    if (!mime) return { error: "Utilisez une image JPEG, PNG, WebP ou un PDF." };
    const extension = mime === "application/pdf" ? "pdf" : extensionFor(mime);
    storagePath = `${current.userId}/${crypto.randomUUID()}.${extension}`;
    const prepared = mime === "image/jpeg" ? stripJpegExif(body) : body;
    try {
      await uploadTalentFile(storagePath, prepared, mime);
    } catch {
      return { error: "Le fichier n'a pas pu être envoyé." };
    }
  }
  if (!storagePath && !external && !comment) return { error: "Ajoutez un commentaire, un fichier ou un lien." };
  const saved = await current.supabase.from("project_deliverables").insert({
    project_id: id,
    author_id: current.userId,
    comment,
    storage_path: storagePath,
    external_url: external,
    version,
  });
  if (saved.error) {
    if (storagePath) await deleteTalentFile(storagePath);
    return fail(saved.error, "Le livrable n'a pas pu être soumis.");
  }
  await current.supabase.from("talent_projects").update({ status: "delivered" }).eq("id", id);
  refresh(`/talents/moi/projets/${id}`);
  return {};
}

export async function proposeAmendment(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const priceMode = String(formData.get("priceMode") ?? "discuter");
  const price = money(formData, priceMode === "indicatif" ? "indicatif" : "discuter");
  if ("error" in price) return { error: price.error };
  const delay = Number(formData.get("delay"));
  const deliverables = clean(formData.get("deliverables"), 500);
  const note = clean(formData.get("note"), 280);
  if (!Number.isInteger(delay) || delay < 1 || deliverables.length < 2) return { error: "Décrivez les nouvelles conditions." };
  const saved = await current.supabase.from("project_amendments").insert({
    project_id: id,
    author_id: current.userId,
    price_cents: price.cents,
    price_mode: priceMode === "indicatif" ? "indicatif" : "discuter",
    delay_days: delay,
    deliverables,
    note,
  });
  if (saved.error) return fail(saved.error, "L'avenant n'a pas pu être proposé.");
  refresh(`/talents/moi/projets/${id}`);
  return {};
}

export async function decideAmendment(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const projectId = String(formData.get("project") ?? "");
  const status = formData.get("accept") === "oui" ? "accepted" : "rejected";
  const saved = await current.supabase.from("project_amendments").update({ status }).eq("id", id).eq("status", "pending");
  if (saved.error) return fail(saved.error, "La décision n'a pas pu être enregistrée.");
  refresh(`/talents/moi/projets/${projectId}`);
  return {};
}

export async function submitReview(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const projectId = String(formData.get("project") ?? "");
  const subjectId = String(formData.get("subject") ?? "");
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 800);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || body.length < 2) return { error: "Donnez une note et un commentaire." };
  if (blocked(body)) return { error: talentError("contenu", "Ce texte n'est pas autorisé.") };
  const saved = await current.supabase.from("talent_reviews").insert({ project_id: projectId, author_id: current.userId, subject_id: subjectId, rating, body });
  if (saved.error) return fail(saved.error, "L'avis n'a pas pu être publié.");
  refresh(`/talents/moi/projets/${projectId}`);
  return {};
}

export async function replyToReview(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 800);
  if (reply.length < 2 || blocked(reply)) return { error: "La réponse n'est pas autorisée." };
  const saved = await current.supabase.from("talent_reviews").update({ reply }).eq("id", id);
  if (saved.error) return fail(saved.error, "La réponse n'a pas pu être enregistrée.");
  refresh("/talents");
  return {};
}

export async function requestPaidAuthorization(): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const saved = await current.supabase.from("talent_authorizations").insert({ user_id: current.userId, kind: "parental_paid", status: "requested", method: "demande" });
  if (saved.error) return { error: "Une demande existe déjà, ou elle n'a pas pu être enregistrée." };
  refresh("/talents/moi/reglages");
  return {};
}

export async function toggleFavorite(formData: FormData): Promise<Result> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "Élément inconnu." };
  if (kind === "service") {
    const existing = await current.supabase.from("service_favorites").select("service_id").eq("user_id", current.userId).eq("service_id", id).maybeSingle();
    const result = existing.data
      ? await current.supabase.from("service_favorites").delete().eq("user_id", current.userId).eq("service_id", id)
      : await current.supabase.from("service_favorites").insert({ user_id: current.userId, service_id: id });
    if (result.error) return { error: "Le favori n'a pas pu être modifié." };
  } else if (kind === "talent") {
    if (id === current.userId) return { error: "Vous ne pouvez pas vous enregistrer vous-même." };
    const existing = await current.supabase.from("talent_favorites").select("talent_id").eq("user_id", current.userId).eq("talent_id", id).maybeSingle();
    const result = existing.data
      ? await current.supabase.from("talent_favorites").delete().eq("user_id", current.userId).eq("talent_id", id)
      : await current.supabase.from("talent_favorites").insert({ user_id: current.userId, talent_id: id });
    if (result.error) return { error: "Le favori n'a pas pu être modifié." };
  } else return { error: "Favori inconnu." };
  refresh("/talents/favoris");
  return {};
}
