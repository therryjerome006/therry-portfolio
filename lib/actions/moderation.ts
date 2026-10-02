"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { dbPool } from "@/lib/media/db";

export async function removeCommentAsAdmin(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/communaute");
  const db = dbPool();
  if (db) await db.query(`delete from public.comments where id = $1`, [id]);
  revalidatePath("/admin/communaute");
  redirect("/admin/communaute");
}
