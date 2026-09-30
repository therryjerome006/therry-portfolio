"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { mediaCategories, mediaTypes, type MediaType } from "@/lib/media/constants";
import {
  deleteMediaPost,
  getMediaById,
  saveMediaPost,
  setMediaStatus,
  slugExists,
} from "@/lib/media/db";
import { isValidSlug, slugify } from "@/lib/media/slug";
import { deleteObject, isOwnStorageUrl, storageRef } from "@/lib/media/storage";
import type { MediaDraftItem, MediaItemKind } from "@/lib/media/types";

export type MediaFormState = { error?: string };

function cleanText(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      const [kind, id] = parsed.pathname.split("/").filter(Boolean);
      if ((kind === "embed" || kind === "shorts") && id) return id;
    }
  } catch {
    return null;
  }
  return null;
}

function vimeoId(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.replace(/^www\./, "").endsWith("vimeo.com")) return null;
    const id = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    return /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function parseItems(raw: string): MediaDraftItem[] | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Les médias de la publication sont illisibles.";
  }
  if (!Array.isArray(parsed)) return "Ajoutez au moins un média.";
  const items: MediaDraftItem[] = [];
  for (const entry of parsed.slice(0, 24)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const kind = String(row.kind ?? "");
    if (kind !== "image" && kind !== "video" && kind !== "youtube" && kind !== "vimeo") continue;
    const url = String(row.url ?? "").trim();
    let normalized = url;
    let itemKind = kind as MediaItemKind;
    if (kind === "youtube" || youtubeId(url)) {
      const id = youtubeId(url);
      if (!id || !/^[\w-]{6,}$/.test(id)) return "Lien YouTube invalide.";
      normalized = `https://www.youtube.com/watch?v=${id}`;
      itemKind = "youtube";
    } else if (kind === "vimeo" || vimeoId(url)) {
      const id = vimeoId(url);
      if (!id) return "Lien Vimeo invalide.";
      normalized = `https://vimeo.com/${id}`;
      itemKind = "vimeo";
    } else if (!isOwnStorageUrl(url)) {
      return "Un fichier ne provient pas du stockage du site.";
    }
    const thumbnailUrl = String(row.thumbnailUrl ?? "").trim();
    if (thumbnailUrl && !isOwnStorageUrl(thumbnailUrl)) return "La miniature n'est pas valide.";
    items.push({
      kind: itemKind,
      url: normalized,
      thumbnailUrl,
      alt: String(row.alt ?? "").trim().slice(0, 180),
      caption: String(row.caption ?? "").trim().slice(0, 280),
      fileName: String(row.fileName ?? "").trim().slice(0, 180),
      fileSize: typeof row.fileSize === "number" ? row.fileSize : null,
      width: typeof row.width === "number" ? row.width : null,
      height: typeof row.height === "number" ? row.height : null,
      durationSeconds: typeof row.durationSeconds === "number" ? row.durationSeconds : null,
      mimeType: String(row.mimeType ?? "").slice(0, 80),
      bucket: String(row.bucket ?? ""),
      storagePath: String(row.storagePath ?? ""),
    });
  }
  return items;
}

function revalidateMedia(slug?: string) {
  revalidatePath("/");
  revalidatePath("/media");
  if (slug) revalidatePath(`/media/${slug}`);
}

export async function saveMedia(_prev: MediaFormState, formData: FormData): Promise<MediaFormState> {
  await requireAdmin();
  const id = cleanText(formData.get("id"), 80);
  const title = cleanText(formData.get("title"), 140);
  const requestedSlug = slugify(cleanText(formData.get("slug"), 80) || title);
  const description = cleanText(formData.get("description"), 2000);
  const type = cleanText(formData.get("type"), 20) as MediaType;
  const category = cleanText(formData.get("category"), 40);
  const status = cleanText(formData.get("status"), 20) === "published" ? "published" : "draft";
  const articlePath = cleanText(formData.get("articlePath"), 180);
  const date = cleanText(formData.get("publishedAt"), 10);
  const tags = cleanText(formData.get("tags"), 400)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!title) return { error: "Le titre est obligatoire." };
  if (!isValidSlug(requestedSlug)) return { error: "L'adresse de la publication n'est pas valide." };
  if (!mediaTypes.includes(type)) return { error: "Choisissez un type de publication." };
  if (!mediaCategories.includes(category as (typeof mediaCategories)[number])) {
    return { error: "Choisissez une catégorie." };
  }
  if (articlePath && !articlePath.startsWith("/blog/")) {
    return { error: "Le lien d'article doit commencer par /blog/." };
  }

  const items = parseItems(String(formData.get("items") ?? "[]"));
  if (typeof items === "string") return { error: items };
  if (type !== "update" && items.length === 0) return { error: "Ajoutez au moins un média." };
  if ((type === "photo" || type === "gallery") && !items.some((item) => item.kind === "image")) {
    return { error: "Cette publication a besoin d'au moins une image." };
  }
  if (type === "video" && !items.some((item) => item.kind !== "image")) {
    return { error: "Cette publication a besoin d'une vidéo." };
  }

  const taken = await slugExists(requestedSlug, id || undefined);
  if (taken) return { error: "Cette adresse est déjà utilisée." };

  let publishedAt: string | null = null;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) publishedAt = `${date}T12:00:00.000Z`;
  else if (status === "published") publishedAt = new Date().toISOString();

  const previous = id ? await getMediaById(id) : null;
  let savedId = "";
  try {
    savedId = await saveMediaPost({
      id: id || undefined,
      title,
      slug: requestedSlug,
      description,
      type,
      category,
      tags,
      status,
      articlePath,
      publishedAt: status === "published" ? publishedAt ?? previous?.publishedAt ?? new Date().toISOString() : publishedAt,
      items,
    });
  } catch {
    return { error: "L'enregistrement a échoué. Vérifiez la connexion à la base." };
  }

  if (previous) {
    const kept = new Set(items.flatMap((item) => [item.url, item.thumbnailUrl]).filter(Boolean));
    for (const item of previous.items) {
      for (const url of [item.url, item.thumbnailUrl]) {
        if (!url || kept.has(url)) continue;
        const ref = storageRef(url);
        if (ref) await deleteObject(ref.bucket, ref.path);
      }
    }
    if (previous.slug !== requestedSlug) revalidateMedia(previous.slug);
  }
  revalidateMedia(requestedSlug);
  redirect(`/admin/media/${savedId}/edit?saved=1`);
}

export async function removeMedia(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const post = await getMediaById(id);
  if (!post) redirect("/admin/media");
  try {
    await deleteMediaPost(id);
  } catch {
    redirect("/admin/media?error=delete");
  }
  for (const item of post.items) {
    for (const url of [item.url, item.thumbnailUrl]) {
      const ref = storageRef(url);
      if (ref) await deleteObject(ref.bucket, ref.path);
    }
  }
  revalidateMedia(post.slug);
  redirect("/admin/media");
}

export async function changeMediaStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") === "published" ? "published" : "draft";
  const post = await getMediaById(id);
  if (!post) redirect("/admin/media");
  await setMediaStatus(id, status);
  revalidateMedia(post.slug);
  redirect("/admin/media");
}
