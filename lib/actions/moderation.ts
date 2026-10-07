"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { dbPool } from "@/lib/media/db";
import { deleteNetworkFile } from "@/lib/network/media";

export async function reviewReport(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const targetType = String(formData.get("targetType") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/reseau");
  if (!["reviewed", "resolved", "dismissed"].includes(status)) redirect("/admin/reseau");
  const db = dbPool();
  if (!db) redirect("/admin/reseau");
  if (formData.get("hide") === "1" && /^[0-9a-f-]{36}$/i.test(targetId) && ["post", "photo", "video"].includes(targetType)) {
    const media = await db.query<{ url: string }>(`select url from public.post_media where post_id = $1`, [targetId]);
    await db.query(`update public.posts set status = 'hidden' where id = $1`, [targetId]);
    for (const row of media.rows) await deleteNetworkFile(row.url);
  }
  if (formData.get("hide") === "1" && /^[0-9a-f-]{36}$/i.test(targetId) && targetType === "article") {
    await db.query(`update public.community_articles set status = 'hidden' where id = $1`, [targetId]);
  }
  if (formData.get("hide") === "1" && targetType === "comment" && /^[0-9a-f-]{36}$/i.test(targetId)) {
    await db.query(`delete from public.comments where id = $1`, [targetId]);
  }
  await db.query(`update public.reports set status = $2 where id = $1`, [id, status]);
  revalidatePath("/");
  revalidatePath("/admin/reseau");
  redirect("/admin/reseau");
}

export async function setSuspension(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("userId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/reseau");
  const db = dbPool();
  if (db) {
    await db.query(`update public.profiles set suspended_at = $2 where id = $1`, [id, formData.get("suspend") === "1" ? new Date().toISOString() : null]);
  }
  revalidatePath("/admin/reseau");
  redirect("/admin/reseau");
}

export async function removeCommentAsAdmin(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/communaute");
  const db = dbPool();
  if (db) await db.query(`delete from public.comments where id = $1`, [id]);
  revalidatePath("/admin/communaute");
  redirect("/admin/communaute");
}
