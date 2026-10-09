"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { generateDrafts } from "@/lib/editorial/ai";
import {
  AI_BATCH_MAX,
  isEditorialCategory,
  isEditorialKind,
  type EditorialKind,
  type EditorialLanguage,
  type EditorialTone,
} from "@/lib/editorial/constants";
import { editorialDatabase, getItem, getSettings, listProfiles, logEvent, takenTimes } from "@/lib/editorial/store";
import { isTimezone, planSlots, zonedLocalToUtc } from "@/lib/editorial/time";
import { buckets, deleteNetworkFile, extensionFor, readAvatar, readImage, readVideo, uploadNetworkFile } from "@/lib/network/media";
import { isExplicit } from "@/lib/network/safety";

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function cleanSite(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString().slice(0, 120);
  } catch {
    return null;
  }
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function go(path: string, etat: string): never {
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}etat=${etat}`);
}

async function database() {
  await requireAdmin();
  const db = editorialDatabase();
  if (!db) go("/admin/studio", "base");
  return db;
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/admin/studio");
}

export async function saveEditorialProfile(formData: FormData) {
  const db = await database();
  const id = clean(formData.get("id"), 40);
  const name = clean(formData.get("name"), 40);
  const description = clean(formData.get("description"), 280);
  const website = cleanSite(clean(formData.get("website"), 120));
  const category = clean(formData.get("category"), 20);
  const active = formData.get("active") === "1";
  const removeAvatar = formData.get("removeAvatar") === "1";
  const back = id ? `/admin/studio/profils/${id}` : "/admin/studio/profils/nouveau";
  if (website == null) go(back, "lien");
  if (name.length < 2 || !isEditorialCategory(category)) go(back, "erreur");
  if (isExplicit(`${name} ${description} ${website}`)) go(back, "explicite");
  let slug = slugify(clean(formData.get("slug"), 40) || name);
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) go("/admin/studio/profils", "erreur");
  const file = formData.get("avatar");
  let avatar = "";
  if (file instanceof File && file.size > 0) {
    const parsed = await readAvatar(file);
    if ("error" in parsed) go(back, "media");
    avatar = await uploadNetworkFile(buckets.avatar, `editorial/avatars/${slug}-${crypto.randomUUID()}.${parsed.extension}`, parsed.body, parsed.mime);
  }
  if (id) {
    const current = await db.query(`select avatar_url, slug from public.editorial_profiles where id = $1`, [id]);
    const previous = current.rows[0];
    if (!previous) go("/admin/studio/profils", "erreur");
    if (!clean(formData.get("slug"), 40)) slug = String(previous.slug);
    const previousSlug = String(previous.slug);
    if (previousSlug !== slug) {
      const taken = await db.query(`select id from public.editorial_profiles where slug = $1 and id <> $2`, [slug, id]);
      const historic = await db.query(`select profile_id from public.editorial_slugs where slug = $1`, [slug]);
      if (taken.rows[0] || (historic.rows[0] && String(historic.rows[0].profile_id) !== id)) {
        if (avatar) await deleteNetworkFile(avatar);
        go(back, "doublon");
      }
      await db.query(`insert into public.editorial_slugs (slug, profile_id) values ($1, $2) on conflict (slug) do nothing`, [previousSlug, id]);
    }
    const nextAvatar = removeAvatar && !avatar ? "" : avatar;
    await db.query(
      `update public.editorial_profiles
       set name = $2, slug = $3, description = $4, website = $5, category = $6, is_active = $7,
           avatar_url = case when $8 = '' and $9 = false then avatar_url else $8 end,
           updated_at = now()
       where id = $1`,
      [id, name, slug, description, website, category, active, nextAvatar, removeAvatar],
    );
    if ((avatar || removeAvatar) && previous.avatar_url && previous.avatar_url !== nextAvatar) await deleteNetworkFile(String(previous.avatar_url));
    await logEvent(null, id, "profile_updated", name);
    refresh();
    revalidatePath(`/redaction/${slug}`);
    if (previousSlug !== slug) revalidatePath(`/redaction/${previousSlug}`);
    go(`/admin/studio/profils/${id}`, "profil-modifie");
  }
  const inserted = await db.query(
    `insert into public.editorial_profiles (name, slug, description, website, category, avatar_url, is_active)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (slug) do nothing
     returning id`,
    [name, slug, description, website, category, avatar, active],
  );
  if (!inserted.rows[0]) {
    if (avatar) await deleteNetworkFile(avatar);
    go("/admin/studio/profils/nouveau", "doublon");
  }
  const createdId = String(inserted.rows[0].id);
  await logEvent(null, createdId, "profile_created", name);
  refresh();
  revalidatePath(`/redaction/${slug}`);
  go(`/admin/studio/profils/${createdId}`, "profil");
}

export async function setProfileState(formData: FormData) {
  const db = await database();
  const id = clean(formData.get("id"), 40);
  const action = clean(formData.get("action"), 20);
  if (action === "archive") {
    await db.query(`update public.editorial_profiles set is_active = false, archived_at = now() where id = $1`, [id]);
    await logEvent(null, id, "profile_archived", "");
  } else if (action === "restore") {
    await db.query(`update public.editorial_profiles set archived_at = null, is_active = true where id = $1`, [id]);
    await logEvent(null, id, "profile_restored", "");
  } else if (action === "off") {
    await db.query(`update public.editorial_profiles set is_active = false where id = $1 and archived_at is null`, [id]);
    await logEvent(null, id, "profile_disabled", "");
  } else if (action === "on") {
    await db.query(`update public.editorial_profiles set is_active = true where id = $1 and archived_at is null`, [id]);
    await logEvent(null, id, "profile_enabled", "");
  }
  refresh();
  go("/admin/studio/profils", "profil-modifie");
}

async function storeMedia(kind: EditorialKind, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size <= 0) return null;
  if (kind === "photo" || kind === "article") {
    const parsed = await readImage(file);
    if ("error" in parsed) return { error: "media" as const };
    const url = await uploadNetworkFile(buckets.image, `editorial/${crypto.randomUUID()}.${parsed.extension}`, parsed.body, parsed.mime);
    return { url, mediaType: "image" as const, mime: parsed.mime, size: file.size, duration: null };
  }
  if (kind === "video") {
    const parsed = await readVideo(file);
    if ("error" in parsed) return { error: "media" as const };
    const url = await uploadNetworkFile(buckets.video, `editorial/${crypto.randomUUID()}.${extensionFor(parsed.mime)}`, parsed.body, parsed.mime);
    return { url, mediaType: "video" as const, mime: parsed.mime, size: file.size, duration: parsed.duration };
  }
  return null;
}

export async function saveEditorialItem(formData: FormData) {
  const db = await database();
  const id = clean(formData.get("id"), 40);
  const intent = clean(formData.get("intent"), 20);
  const profileId = clean(formData.get("profileId"), 40);
  const kindValue = clean(formData.get("kind"), 20);
  const title = clean(formData.get("title"), 120);
  const body = String(formData.get("body") ?? "").replace(/\u0000/g, "").trim().slice(0, 20000);
  const discussion = clean(formData.get("discussion"), 200);
  const category = clean(formData.get("category"), 40);
  const language = clean(formData.get("language"), 2);
  if (!isEditorialKind(kindValue)) go(id ? `/admin/studio/${id}` : "/admin/studio/nouveau", "erreur");
  const kind = kindValue;
  const back = id ? `/admin/studio/${id}` : "/admin/studio/nouveau";
  if (!/^[0-9a-f-]{36}$/i.test(profileId)) go(back, "erreur");
  if (isExplicit(`${title} ${body} ${discussion}`)) go(back, "explicite");
  if (kind !== "article" && body.length > 500) go(back, "longueur");
  if (kind === "article" && intent === "publish" && (title.length < 3 || body.length < 20)) go(back, "longueur");
  if (kind === "text" && intent === "publish" && body.length < 1) go(back, "longueur");
  const lang = language === "ht" || language === "en" ? language : "fr";
  const profile = await db.query(`select id, is_active, archived_at from public.editorial_profiles where id = $1`, [profileId]);
  if (!profile.rows[0] || profile.rows[0].archived_at) go(back, "inactif");
  const current = id ? await getItem(id) : null;
  if (id && !current) go("/admin/studio/bibliotheque", "erreur");
  if (current?.status === "archived") go(`/admin/studio/${id}`, "fige");
  if (current?.status === "published" && intent !== "draft") go(`/admin/studio/${id}`, "fige");

  const uploaded = await storeMedia(kind === "article" ? "article" : kind, formData.get("file"));
  if (uploaded && "error" in uploaded) go(back, "media");
  const coverUpload = kind === "article" ? await storeMedia("photo", formData.get("cover")) : null;
  if (coverUpload && "error" in coverUpload) go(back, "media");

  const keepMedia = kind === "photo" || kind === "video";
  const mediaUrl = keepMedia ? (uploaded && "url" in uploaded ? uploaded.url : current?.mediaUrl || "") : "";
  const mediaType = keepMedia ? (uploaded && "url" in uploaded ? uploaded.mediaType : current?.mediaType || null) : null;
  const coverUrl = coverUpload && "url" in coverUpload ? coverUpload.url : current?.coverUrl || "";
  const mime = uploaded && "url" in uploaded ? uploaded.mime : "";
  const size = uploaded && "url" in uploaded ? uploaded.size : current?.fileSize;
  const duration = uploaded && "url" in uploaded ? uploaded.duration : current?.duration;

  if (intent === "publish" && (kind === "photo" || kind === "video") && !mediaUrl) {
    if (uploaded && "url" in uploaded) await deleteNetworkFile(uploaded.url);
    go(back, "media");
  }
  if (intent === "publish" && profile.rows[0].is_active !== true) go(back, "inactif");

  let itemId = id;
  if (!itemId) {
    const inserted = await db.query(
      `insert into public.editorial_items
        (profile_id, kind, title, body, discussion, category, language, cover_url, media_url, media_type, mime_type, file_size, duration, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft')
       returning id`,
      [profileId, kind, title, body, discussion, category, lang, coverUrl, mediaUrl, mediaType || null, mime, size ?? null, duration ?? null],
    );
    itemId = String(inserted.rows[0].id);
    await logEvent(itemId, profileId, "draft_created", kind);
  } else {
    await db.query(
      `update public.editorial_items
       set profile_id = $2, kind = $3, title = $4, body = $5, discussion = $6, category = $7, language = $8,
           cover_url = $9, media_url = $10, media_type = $11, mime_type = case when $12 = '' then mime_type else $12 end,
           file_size = coalesce($13, file_size), duration = coalesce($14, duration)
       where id = $1 and status <> 'archived'`,
      [itemId, profileId, kind, title, body, discussion, category, lang, coverUrl, mediaUrl, mediaType || null, mime, size ?? null, duration ?? null],
    );
    await logEvent(itemId, profileId, "draft_updated", kind);
    if (current?.mediaUrl && current.mediaUrl !== mediaUrl) await deleteNetworkFile(current.mediaUrl);
    if (coverUpload && current?.coverUrl && current.coverUrl !== coverUrl) await deleteNetworkFile(current.coverUrl);
  }

  if (intent === "schedule") {
    const settings = await getSettings();
    const when = zonedLocalToUtc(clean(formData.get("when"), 16), settings.timezone);
    if (!when || when.getTime() < Date.now() + 60_000) go(`/admin/studio/${itemId}`, "horaire");
    const slots = planSlots(when, 1, settings.timezone, settings.maxPerDay, settings.minIntervalMinutes, await takenTimes());
    if (slots.length === 0 || Math.abs(slots[0].getTime() - when.getTime()) > 60_000) go(`/admin/studio/${itemId}`, "cadence");
    await db.query(
      `update public.editorial_items set status = 'scheduled', scheduled_at = $2, error = '' where id = $1 and status in ('draft', 'scheduled', 'failed')`,
      [itemId, when.toISOString()],
    );
    await logEvent(itemId, profileId, "scheduled", when.toISOString());
    refresh();
    go("/admin/studio/programmes", "programme");
  }

  if (intent === "publish") {
    const released = await db.query(`select outcome, detail from public.editorial_release($1::uuid)`, [itemId]);
    const outcome = String(released.rows[0]?.outcome || "");
    refresh();
    if (outcome === "published") go("/admin/studio/bibliotheque?statut=published", "publie");
    go(`/admin/studio/${itemId}`, outcome === "failed" ? "echec" : "erreur");
  }

  refresh();
  go(`/admin/studio/${itemId}`, "brouillon");
}

export async function editorialItemAction(formData: FormData) {
  const db = await database();
  const id = clean(formData.get("id"), 40);
  const action = clean(formData.get("action"), 20);
  const item = await getItem(id);
  if (!item) go("/admin/studio/bibliotheque", "erreur");
  if (action === "archive") {
    await db.query(`update public.editorial_items set status = 'archived' where id = $1 and status <> 'archived'`, [id]);
    await logEvent(id, item.profileId, "archived", "");
    refresh();
    go("/admin/studio/bibliotheque", "archive");
  }
  if (action === "unschedule") {
    await db.query(`update public.editorial_items set status = 'draft', scheduled_at = null where id = $1 and status = 'scheduled'`, [id]);
    await logEvent(id, item.profileId, "unscheduled", "");
    refresh();
    go("/admin/studio/programmes", "annule");
  }
  if (action === "duplicate") {
    const copy = await db.query(
      `insert into public.editorial_items
        (profile_id, kind, title, body, discussion, category, language, source, note, cover_url, media_url, media_type, mime_type, file_size, duration, status)
       select profile_id, kind, title, body, discussion, category, language, source, note, cover_url, media_url, media_type, mime_type, file_size, duration, 'draft'
       from public.editorial_items where id = $1
       returning id`,
      [id],
    );
    const copyId = String(copy.rows[0]?.id || "");
    await logEvent(copyId, item.profileId, "duplicated", id);
    refresh();
    go(copyId ? `/admin/studio/${copyId}` : "/admin/studio/bibliotheque", "duplique");
  }
  if (action === "publish") {
    const released = await db.query(`select outcome from public.editorial_release($1::uuid)`, [id]);
    refresh();
    go("/admin/studio/bibliotheque", String(released.rows[0]?.outcome) === "published" ? "publie" : "echec");
  }
  if (action === "reschedule") {
    const settings = await getSettings();
    const when = zonedLocalToUtc(clean(formData.get("when"), 16), settings.timezone);
    if (!when || when.getTime() < Date.now() + 60_000) go("/admin/studio/programmes", "horaire");
    const others = (await takenTimes()).filter((date) => item.scheduledAt && Math.abs(date.getTime() - new Date(item.scheduledAt).getTime()) > 1000);
    const slots = planSlots(when, 1, settings.timezone, settings.maxPerDay, settings.minIntervalMinutes, others);
    if (slots.length === 0) go("/admin/studio/programmes", "cadence");
    await db.query(
      `update public.editorial_items set status = 'scheduled', scheduled_at = $2, error = '' where id = $1 and status in ('scheduled', 'failed', 'draft')`,
      [id, slots[0].toISOString()],
    );
    await logEvent(id, item.profileId, "rescheduled", slots[0].toISOString());
    refresh();
    go("/admin/studio/programmes", "programme");
  }
  go("/admin/studio/bibliotheque", "erreur");
}

export async function scheduleSelection(formData: FormData) {
  const db = await database();
  const ids = formData.getAll("id").map((value) => clean(value, 40)).filter((value) => /^[0-9a-f-]{36}$/i.test(value)).slice(0, 40);
  const settings = await getSettings();
  const when = zonedLocalToUtc(clean(formData.get("when"), 16), settings.timezone);
  if (!when || ids.length === 0) go("/admin/studio/brouillons", "horaire");
  const start = when.getTime() < Date.now() + 60_000 ? new Date(Date.now() + 5 * 60_000) : when;
  const slots = planSlots(start, ids.length, settings.timezone, settings.maxPerDay, settings.minIntervalMinutes, await takenTimes());
  if (slots.length < ids.length) go("/admin/studio/brouillons", "cadence");
  for (let index = 0; index < ids.length; index += 1) {
    await db.query(
      `update public.editorial_items set status = 'scheduled', scheduled_at = $2, error = '' where id = $1 and status in ('draft', 'failed')`,
      [ids[index], slots[index].toISOString()],
    );
    await logEvent(ids[index], null, "scheduled", slots[index].toISOString());
  }
  refresh();
  go("/admin/studio/programmes", "programme");
}

export async function publishDueNow() {
  const db = await database();
  const released = await db.query(`select outcome from public.editorial_release(null)`);
  await logEvent(null, null, "publish_due", `${released.rowCount ?? 0}`);
  refresh();
  const paused = released.rows.some((row) => row.outcome === "paused");
  go("/admin/studio", paused ? "pause" : "dus");
}

export async function saveEditorialSettings(formData: FormData) {
  const db = await database();
  const maxPerDay = Number(clean(formData.get("maxPerDay"), 2));
  const interval = Number(clean(formData.get("interval"), 3));
  const timezone = clean(formData.get("timezone"), 40);
  const paused = formData.get("paused") === "1";
  if (!isTimezone(timezone) || maxPerDay < 1 || maxPerDay > 24 || interval < 15 || interval > 720) go("/admin/studio", "erreur");
  await db.query(
    `update public.editorial_settings set paused = $1, max_per_day = $2, min_interval_minutes = $3, timezone = $4, updated_at = now() where id = 1`,
    [paused, maxPerDay, interval, timezone],
  );
  await logEvent(null, null, "settings_updated", paused ? "suspendu" : "actif");
  go("/admin/studio", "reglages");
}

export async function generateEditorialDrafts(formData: FormData) {
  const db = await database();
  const count = Math.min(AI_BATCH_MAX, Math.max(1, Number(clean(formData.get("count"), 2)) || 1));
  const tone = clean(formData.get("tone"), 20) as EditorialTone;
  const language = (clean(formData.get("language"), 2) || "fr") as EditorialLanguage;
  const length = clean(formData.get("length"), 20);
  const audience = clean(formData.get("audience"), 80) || "12 à 22 ans";
  const avoid = clean(formData.get("avoid"), 280);
  const profileSlug = clean(formData.get("profileSlug"), 40);
  const categories = formData.getAll("category").map((value) => clean(value, 20)).filter(isEditorialCategory);
  const kinds = formData.getAll("kind").map((value) => clean(value, 20)).filter(isEditorialKind);
  const profiles = await listProfiles(false);
  const profile = profiles.find((item) => item.slug === profileSlug && item.isActive) || profiles.find((item) => item.isActive);
  if (!profile) go("/admin/studio/generer", "inactif");
  const generated = await generateDrafts({
    count,
    categories: categories.length ? categories : [profile.category],
    kinds: kinds.length ? kinds : ["text"],
    tone: ["informatif", "humoristique", "pedagogique", "conversationnel", "inspirant"].includes(tone) ? tone : "informatif",
    language: language === "ht" || language === "en" ? language : "fr",
    audience,
    profileSlug: profile.slug,
    length: length === "moyenne" || length === "article" ? length : "courte",
    avoid,
  });
  if ("error" in generated && generated.error) go("/admin/studio/generer", generated.error.includes("configuré") ? "ia-off" : "ia");
  const bySlug = new Map(profiles.map((item) => [item.slug, item]));
  for (const draft of generated.drafts) {
    const owner = bySlug.get(draft.profileSlug) || profile;
    const inserted = await db.query(
      `insert into public.editorial_items
        (profile_id, kind, title, body, discussion, category, language, source, note, status)
       values ($1,$2,$3,$4,$5,$6,$7,'ai',$8,'draft')
       returning id`,
      [owner.id, draft.kind, draft.title, draft.body, draft.discussion, draft.category, draft.language, draft.note],
    );
    await logEvent(String(inserted.rows[0].id), owner.id, "ai_draft", draft.kind);
  }
  refresh();
  go("/admin/studio/brouillons", "brouillons");
}
