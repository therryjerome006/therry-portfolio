"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { dbPool } from "@/lib/media/db";
import { deleteNetworkFile } from "@/lib/network/media";
import { isExplicit } from "@/lib/network/safety";

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
  if (formData.get("hide") === "1" && targetType === "group" && /^[0-9a-f-]{36}$/i.test(targetId)) {
    const closed = await db.query<{ slug: string; owner_id: string | null }>(
      `update public.community_groups g
       set status = 'closed'
       from public.communities c
       where g.id = $1 and g.kind = 'member' and c.id = g.community_id
       returning c.slug, g.owner_id`,
      [targetId],
    );
    const row = closed.rows[0];
    if (row?.owner_id) {
      await db.query(`insert into public.notifications (user_id, kind, note) values ($1, 'group_closed', $2)`, [row.owner_id, "Votre groupe a été fermé après un signalement."]);
    }
    if (row?.slug) revalidatePath(`/communautes/${row.slug}`);
  }
  await db.query(`update public.reports set status = $2 where id = $1`, [id, status]);
  revalidatePath("/");
  revalidatePath("/admin/reseau");
  redirect("/admin/reseau");
}

export async function reviewSchoolRequest(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || (decision !== "approve" && decision !== "reject")) redirect("/admin/reseau");
  const db = dbPool();
  if (!db) redirect("/admin/reseau?ecole=erreur");
  const client = await db.connect();
  let code = "ok";
  let slug = "";
  try {
    await client.query("begin");
    const found = await client.query<{ user_id: string; group_id: string; name: string; status: string; slug: string }>(
      `select r.user_id, r.group_id, r.name, r.status, c.slug
       from public.school_requests r
       join public.community_groups g on g.id = r.group_id
       join public.communities c on c.id = g.community_id
       where r.id = $1
       for update of r`,
      [id],
    );
    const row = found.rows[0];
    if (!row || row.status !== "pending") {
      code = "absente";
    } else if (decision === "reject") {
      await client.query(`update public.school_requests set status = 'rejected', reviewed_at = now() where id = $1`, [id]);
      slug = row.slug;
      code = "rejetee";
    } else {
      const duplicate = await client.query(`select id from public.schools where group_id = $1 and lower(name) = lower($2) limit 1`, [row.group_id, row.name]);
      const managed = await client.query(
        `select 1
         from public.school_members m
         join public.schools s on s.id = m.school_id
         join public.community_groups g on g.id = s.group_id
         where m.user_id = $1 and m.role = 'manager'
           and g.community_id = (select community_id from public.community_groups where id = $2)
         limit 1`,
        [row.user_id, row.group_id],
      );
      if (duplicate.rows[0]) {
        code = "doublon";
      } else if (managed.rows[0]) {
        code = "gerant";
      } else {
        const created = await client.query<{ id: string }>(`insert into public.schools (group_id, name) values ($1, $2) returning id`, [row.group_id, row.name]);
        const schoolId = created.rows[0]?.id;
        if (!schoolId) throw new Error("missing school");
        await client.query(
          `delete from public.school_members m
           using public.schools s, public.community_groups g
           where m.school_id = s.id and s.group_id = g.id and m.user_id = $1 and m.role <> 'manager'
             and g.community_id = (select community_id from public.community_groups where id = $2)`,
          [row.user_id, row.group_id],
        );
        await client.query(`insert into public.school_members (user_id, school_id, role) values ($1, $2, 'manager')`, [row.user_id, schoolId]);
        await client.query(`update public.school_requests set status = 'approved', school_id = $2, reviewed_at = now() where id = $1`, [id, schoolId]);
        slug = row.slug;
        code = "creee";
      }
    }
    await client.query("commit");
  } catch {
    await client.query("rollback");
    code = "erreur";
  } finally {
    client.release();
  }
  if (slug) revalidatePath(`/communautes/${slug}`);
  revalidatePath("/admin/reseau");
  revalidatePath("/publier");
  redirect(`/admin/reseau?ecole=${code}`);
}

export async function moderateMemberGroup(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["close", "reopen", "flag", "unflag", "warn"].includes(action)) redirect("/admin/reseau?groupe=erreur");
  const db = dbPool();
  if (!db) redirect("/admin/reseau?groupe=erreur");
  const found = await db.query<{ owner_id: string | null; slug: string }>(
    `select g.owner_id, c.slug
     from public.community_groups g
     join public.communities c on c.id = g.community_id
     where g.id = $1 and g.kind = 'member'`,
    [id],
  );
  const row = found.rows[0];
  if (!row) redirect("/admin/reseau?groupe=erreur");
  let code = "erreur";
  let kind = "";
  let note = "";
  try {
    if (action === "close") {
      await db.query(`update public.community_groups set status = 'closed' where id = $1 and kind = 'member'`, [id]);
      code = "ferme";
      kind = "group_closed";
      note = "Votre groupe a été fermé par l'administration.";
    } else if (action === "reopen") {
      await db.query(`update public.community_groups set status = 'open' where id = $1 and kind = 'member'`, [id]);
      code = "rouvert";
      kind = "group_reopened";
      note = "Votre groupe a été rouvert.";
    } else if (action === "flag") {
      await db.query(`update public.community_groups set flagged = true where id = $1 and kind = 'member'`, [id]);
      code = "signale";
    } else if (action === "unflag") {
      await db.query(`update public.community_groups set flagged = false where id = $1 and kind = 'member'`, [id]);
      code = "retire";
    } else {
      const message = String(formData.get("message") ?? "").trim().replace(/\s+/g, " ").slice(0, 280);
      if (message.length < 8 || isExplicit(message)) redirect("/admin/reseau?groupe=erreur");
      await db.query(`update public.community_groups set warning = $2 where id = $1 and kind = 'member'`, [id, message]);
      code = "avertissement";
      kind = "group_warning";
      note = message;
    }
  } catch {
    redirect("/admin/reseau?groupe=erreur");
  }
  if (kind && row.owner_id) {
    await db.query(`insert into public.notifications (user_id, kind, note) values ($1, $2, $3)`, [row.owner_id, kind, note]);
  }
  revalidatePath(`/communautes/${row.slug}`);
  revalidatePath("/notifications");
  revalidatePath("/admin/reseau");
  redirect(`/admin/reseau?groupe=${code}`);
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
