"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activityCategories, type ActivityCategory } from "@/data/activities";
import {
  deleteActivityPost,
  getActivityPost,
  saveActivityPost,
  setActivityStatus,
  type ActivityItemInput,
} from "@/lib/activities/db";
import { requireAdmin } from "@/lib/auth/session";
import { deleteObject, isOwnStorageUrl, storageRef } from "@/lib/media/storage";

export type ActivityFormState = { error?: string };

const MAX_ITEMS = 12;

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function revalidateActivities() {
  revalidatePath("/realisations");
  revalidatePath("/admin/realisations");
}

function parseItems(raw: string): ActivityItemInput[] | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "Les photos de la publication sont illisibles.";
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return "Ajoutez au moins une photo.";
  if (parsed.length > MAX_ITEMS) return `Maximum ${MAX_ITEMS} fichiers par publication.`;
  const items: ActivityItemInput[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const kind = String(row.kind ?? "");
    const url = String(row.url ?? "").trim();
    const bucket = String(row.bucket ?? "").trim();
    const storagePath = String(row.storagePath ?? "").trim();
    if (kind !== "image" && kind !== "video") return "Un fichier n'est ni une photo ni une vidéo.";
    if (!isOwnStorageUrl(url)) return "Un fichier ne provient pas du stockage du site.";
    const ref = storageRef(url);
    if (!ref || ref.bucket !== bucket || ref.path !== storagePath) return "Un fichier envoyé est incomplet.";
    items.push({ kind, url, bucket, storagePath });
  }
  if (items.length === 0) return "Ajoutez au moins une photo.";
  return items;
}

export async function saveActivity(_prev: ActivityFormState, formData: FormData): Promise<ActivityFormState> {
  await requireAdmin();
  const id = clean(formData.get("id"), 80);
  const category = clean(formData.get("category"), 40);
  const description = clean(formData.get("description"), 2000);
  const status = clean(formData.get("status"), 20) === "published" ? "published" : "draft";
  const items = parseItems(String(formData.get("items") ?? ""));

  if (!activityCategories.includes(category as ActivityCategory)) {
    return { error: "Choisissez une activité." };
  }
  if (description.length < 1) return { error: "Ajoutez une description pour la publication." };
  if (typeof items === "string") return { error: items };

  const previous = id ? await getActivityPost(id) : null;
  let savedId = "";
  try {
    savedId = await saveActivityPost({
      id: id || undefined,
      category: category as ActivityCategory,
      description,
      status,
      items,
    });
  } catch (error) {
    console.error("activity save", error instanceof Error ? error.message : "query");
    return { error: "L'enregistrement a échoué." };
  }

  const kept = new Set(items.map((item) => item.url));
  for (const item of previous?.items ?? []) {
    if (!kept.has(item.url)) await deleteObject(item.bucket, item.storagePath);
  }

  revalidateActivities();
  redirect(`/admin/realisations/${savedId}/edit?saved=1`);
}

export async function changeActivityStatus(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"), 80);
  const status = clean(formData.get("status"), 20) === "published" ? "published" : "draft";
  if (!id) redirect("/admin/realisations");
  await setActivityStatus(id, status);
  revalidateActivities();
  redirect("/admin/realisations");
}

export async function removeActivity(formData: FormData) {
  await requireAdmin();
  const id = clean(formData.get("id"), 80);
  const removed = id ? await deleteActivityPost(id) : null;
  for (const item of removed?.items ?? []) {
    await deleteObject(item.bucket, item.storagePath);
  }
  revalidateActivities();
  redirect(removed ? "/admin/realisations" : "/admin/realisations?error=delete");
}
