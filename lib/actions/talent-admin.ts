"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { adminAccountSignedIn } from "@/lib/auth/owner";
import { dbPool } from "@/lib/media/db";
import { deleteTalentFile, listTalentFiles } from "@/lib/talents/files";

async function actor() {
  await requireAdmin();
  const pool = dbPool();
  if (!pool) throw new Error("Base indisponible.");
  return pool;
}

async function audit(pool: NonNullable<ReturnType<typeof dbPool>>, action: string, targetType: string, targetId: string, reason: string) {
  const signed = await adminAccountSignedIn();
  if (!signed) return;
  await pool.query(
    `insert into public.talent_audit (actor_id, action, target_type, target_id, reason)
     select id, $1, $2, $3, $4 from public.profiles where is_admin = true limit 1`,
    [action, targetType, targetId, reason.slice(0, 280)],
  );
}

export async function setTalentPolicy(formData: FormData) {
  const pool = await actor();
  const paid = formData.get("paidMinors") === "oui";
  const org = formData.get("orgOffers") === "oui";
  const phrase = String(formData.get("phrase") ?? "");
  if ((paid || org) && phrase !== "VALIDATION JURIDIQUE") {
    return;
  }
  await pool.query("update public.talent_policy set paid_minors_enabled = $1, org_offers_enabled = $2, updated_at = now() where id = 1", [paid, org]);
  await audit(pool, "policy", "talent_policy", "1", paid || org ? "Contrôle ouvert après saisie de la phrase exigée. Ce n'est pas une validation juridique." : "Contrôle refermé.");
  revalidatePath("/admin/talents");
  revalidatePath("/talents");
}

export async function saveTalentCategory(formData: FormData) {
  const pool = await actor();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim().slice(0, 280);
  const sort = Number(formData.get("sort") ?? 0);
  const active = formData.get("active") === "oui";
  const parent = String(formData.get("parent") ?? "");
  const parentId = /^[0-9a-f-]{36}$/i.test(parent) ? parent : null;
  if (!/^[a-z0-9-]{2,40}$/.test(slug) || name.length < 2) return;
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    await pool.query("update public.talent_categories set name = $2, description = $3, sort_order = $4, active = $5, parent_id = $6, updated_at = now() where id = $1", [id, name, description, sort, active, parentId]);
  } else {
    await pool.query("insert into public.talent_categories (slug, name, description, sort_order, active) values ($1, $2, $3, $4, $5)", [slug, name, description, sort, active]);
  }
  await audit(pool, "category", "talent_category", id || slug, name);
  revalidatePath("/admin/talents");
  revalidatePath("/talents");
}

export async function saveTalentSkill(formData: FormData) {
  const pool = await actor();
  const category = String(formData.get("category") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const active = formData.get("active") !== "non";
  if (!/^[0-9a-f-]{36}$/i.test(category) || name.length < 2) return;
  await pool.query(
    `insert into public.skills (category_id, name, active) values ($1, $2, $3)
     on conflict (category_id, lower(name)) do update set active = excluded.active, updated_at = now()`,
    [category, name, active],
  );
  await audit(pool, "skill", "skill", category, name);
  revalidatePath("/admin/talents");
}

export async function moderateTalent(formData: FormData) {
  const pool = await actor();
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 280);
  if (!/^[0-9a-f-]{36}$/i.test(id) || reason.length < 3) return;
  if (kind === "service" && action === "suspend") {
    await pool.query("update public.services set status = 'suspended', moderation_hold = true, updated_at = now() where id = $1", [id]);
  } else if (kind === "service" && action === "restore") {
    await pool.query("update public.services set moderation_hold = false, status = 'draft', updated_at = now() where id = $1", [id]);
  } else if (kind === "opportunity" && action === "suspend") {
    await pool.query("update public.opportunities set status = 'suspended', moderation_hold = true, updated_at = now() where id = $1", [id]);
  } else if (kind === "profile" && action === "hold") {
    await pool.query("update public.talent_profiles set status = 'suspended', moderation_hold = true, show_public = false, updated_at = now() where user_id = $1", [id]);
  } else if (kind === "profile" && action === "restore") {
    await pool.query("update public.talent_profiles set moderation_hold = false, status = 'draft', updated_at = now() where user_id = $1", [id]);
  } else if (kind === "review" && action === "hide") {
    await pool.query("update public.talent_reviews set status = 'hidden' where id = $1", [id]);
  } else if (kind === "project" && ["active", "cancelled", "done"].includes(action)) {
    await pool.query("update public.talent_projects set status = $2, updated_at = now() where id = $1 and status = 'dispute'", [id, action]);
  } else if (kind === "report") {
    await pool.query("update public.reports set status = $2 where id = $1", [id, action]);
  } else {
    return;
  }
  await audit(pool, action, kind, id, reason);
  revalidatePath("/admin/talents");
  revalidatePath("/talents");
}

export async function decideAuthorization(formData: FormData) {
  const pool = await actor();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const proof = String(formData.get("proof") ?? "").trim().slice(0, 500);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["pending_review", "granted", "revoked"].includes(status)) return;
  await pool.query(
    `update public.talent_authorizations
     set status = $2, reviewed_at = now(), reviewer_id = (select id from public.profiles where is_admin = true limit 1), method = 'examen administrateur'
     where id = $1`,
    [id, status],
  );
  if (proof) {
    await pool.query(
      `insert into public.talent_authorization_notes (authorization_id, proof_note) values ($1, $2)
       on conflict (authorization_id) do update set proof_note = excluded.proof_note`,
      [id, proof],
    );
  }
  await audit(pool, status, "authorization", id, "Décision d'autorisation. Elle ne vaut pas validation juridique.");
  revalidatePath("/admin/talents");
}

export async function cleanupTalentFiles() {
  const pool = await actor();
  const referenced = await pool.query("select storage_path from public.portfolio_media union select storage_path from public.project_deliverables where storage_path <> ''");
  const known = new Set(referenced.rows.map((row) => String(row.storage_path)));
  const folders = await listTalentFiles("");
  let removed = 0;
  for (const folder of folders.slice(0, 20)) {
    const files = await listTalentFiles(`${folder}/`);
    for (const file of files) {
      const path = `${folder}/${file}`;
      if (!known.has(path) && removed < 20) {
        await deleteTalentFile(path);
        removed += 1;
      }
    }
  }
  await audit(pool, "cleanup", "storage", "talent-files", `${removed} fichier(s) orphelin(s) retiré(s).`);
  revalidatePath("/admin/talents");
}
