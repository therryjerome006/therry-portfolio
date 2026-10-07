"use server";

import { revalidatePath } from "next/cache";
import { articleCategories, audienceChoices, isReportReason } from "@/lib/network/constants";
import { buckets, deleteNetworkFile, readImage, readVideo, uploadNetworkFile } from "@/lib/network/media";
import { explicitMessage, isExplicit } from "@/lib/network/safety";
import { ensureProfile } from "@/lib/social/queries";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; auth?: boolean; id?: string };

async function session() {
  const supabase = await createClient();
  if (!supabase) return { error: "Le réseau n'est pas disponible." } as const;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { auth: true, supabase } as const;
  await ensureProfile(supabase, data.user.id);
  const { data: profile } = await supabase.from("profiles").select("suspended_at, age_band").eq("id", data.user.id).maybeSingle();
  if (profile?.suspended_at) return { error: "Ce compte est suspendu." } as const;
  return { supabase, userId: data.user.id, ageBand: profile?.age_band || "unknown" };
}

function chosenAudience(formData: FormData, ageBand: string) {
  const selected = [...new Set(formData.getAll("audience").map((value) => String(value)))];
  const allowed = new Set<string>(audienceChoices(ageBand));
  if (selected.length === 0 || selected.some((band) => !allowed.has(band))) {
    return { error: "Choisissez au moins une tranche d'âge autorisée." } as const;
  }
  return { audience: selected } as const;
}

function cleanSchoolName(value: string) {
  const name = value.trim().replace(/\s+/g, " ").slice(0, 80);
  if (name.length < 2) return { error: "Indiquez le nom de l'école." } as const;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '&.,()\-]{1,79}$/u.test(name)) return { error: "Utilisez le nom de l'école." } as const;
  if (isExplicit(name)) return { error: explicitMessage } as const;
  return { name } as const;
}

function publicationError(message: string, fallback: string) {
  if (message.includes("explicites")) return explicitMessage;
  if (message.includes("tranche")) return "Cette tranche d'âge ne peut pas être choisie.";
  if (message.includes("insigne") || message.includes("école")) return "L'insigne de l'école ne peut pas être utilisé ici.";
  if (message.includes("12 à 22")) return "Les groupes d'écoles sont réservés aux 12 à 22 ans.";
  return fallback;
}

function caption(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().slice(0, 500);
}

export async function createPost(formData: FormData): Promise<ActionState> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const kind = String(formData.get("kind") ?? "");
  const body = caption(formData.get("body"));
  const community = String(formData.get("community") ?? "");
  if (kind !== "text" && kind !== "photo" && kind !== "video") return { error: "Choisissez un type de publication." };
  if (kind === "text" && !body) return { error: "Écrivez votre twit." };
  if (isExplicit(body)) return { error: explicitMessage };
  const audience = chosenAudience(formData, current.ageBand);
  if ("error" in audience) return audience;
  const communityId = /^[0-9a-f-]{36}$/i.test(community) ? community : null;
  const badge = String(formData.get("schoolBadge") ?? "");
  let schoolId: string | null = null;
  if (badge) {
    if (!communityId || !/^[0-9a-f-]{36}$/i.test(badge)) return { error: "Choisissez la communauté de votre école pour publier sous son insigne." };
    const membership = await current.supabase.from("school_members").select("school_id").eq("user_id", current.userId).eq("school_id", badge).maybeSingle();
    const school = await current.supabase.from("schools").select("group_id").eq("id", badge).maybeSingle();
    const group = school.data
      ? await current.supabase.from("community_groups").select("community_id, kind").eq("id", school.data.group_id).maybeSingle()
      : { data: null };
    if (!membership.data || group.data?.community_id !== communityId || group.data.kind !== "schools") {
      return { error: "L'insigne de l'école ne peut pas être utilisé ici." };
    }
    schoolId = badge;
  }

  let media: { url: string; mediaType: "image" | "video"; mime: string; size: number; duration: number | null } | null = null;
  if (kind !== "text") {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { error: kind === "photo" ? "Ajoutez une photo." : "Ajoutez une vidéo." };
    const parsed = kind === "photo" ? await readImage(file) : await readVideo(file);
    if ("error" in parsed) return { error: parsed.error };
    const path = `${current.userId}/${crypto.randomUUID()}.${parsed.extension}`;
    const bucket = kind === "photo" ? buckets.image : buckets.video;
    try {
      const url = await uploadNetworkFile(bucket, path, parsed.body, parsed.mime);
      media = {
        url,
        mediaType: kind === "photo" ? "image" : "video",
        mime: parsed.mime,
        size: parsed.body.length,
        duration: "duration" in parsed ? parsed.duration : null,
      };
    } catch {
      return { error: "L'envoi du fichier a échoué." };
    }
  }

  const { data, error } = await current.supabase
    .from("posts")
    .insert({
      user_id: current.userId,
      kind,
      body,
      community_id: communityId,
      audience: audience.audience,
      school_id: schoolId,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (media) await deleteNetworkFile(media.url);
    return { error: publicationError(error?.message ?? "", "La publication n'a pas pu être créée.") };
  }
  if (media) {
    const saved = await current.supabase.from("post_media").insert({
      post_id: data.id,
      media_type: media.mediaType,
      url: media.url,
      file_size: media.size,
      duration: media.duration,
      mime_type: media.mime,
    });
    if (saved.error) {
      await current.supabase.from("posts").delete().eq("id", data.id);
      await deleteNetworkFile(media.url);
      return { error: "Le média n'a pas pu être enregistré." };
    }
  }
  revalidatePath("/");
  return { id: data.id };
}

export async function removePost(postId: string): Promise<ActionState> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current)) return { auth: true };
  const { data } = await current.supabase.from("post_media").select("url").eq("post_id", postId);
  const { error } = await current.supabase.from("posts").delete().eq("id", postId).eq("user_id", current.userId);
  if (error) return { error: "La suppression a échoué." };
  for (const row of data ?? []) await deleteNetworkFile(row.url);
  revalidatePath("/");
  return {};
}

export async function toggleFollow(userId: string): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { error: "Profil inconnu." };
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  if (current.userId === userId) return { error: "Vous ne pouvez pas vous suivre." };
  const existing = await current.supabase.from("follows").select("follower_id").eq("follower_id", current.userId).eq("following_id", userId).maybeSingle();
  const result = existing.data
    ? await current.supabase.from("follows").delete().eq("follower_id", current.userId).eq("following_id", userId)
    : await current.supabase.from("follows").insert({ follower_id: current.userId, following_id: userId });
  if (result.error) return { error: "Cette personne ne peut pas être suivie." };
  revalidatePath("/profil");
  return {};
}

export async function toggleBlock(userId: string): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { error: "Profil inconnu." };
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  if (current.userId === userId) return { error: "Action impossible." };
  const existing = await current.supabase.from("blocks").select("blocker_id").eq("blocker_id", current.userId).eq("blocked_id", userId).maybeSingle();
  if (existing.data) {
    await current.supabase.from("blocks").delete().eq("blocker_id", current.userId).eq("blocked_id", userId);
  } else {
    await current.supabase.from("follows").delete().eq("follower_id", current.userId).eq("following_id", userId);
    await current.supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", current.userId);
    const { error } = await current.supabase.from("blocks").insert({ blocker_id: current.userId, blocked_id: userId });
    if (error) return { error: "Le blocage a échoué." };
  }
  revalidatePath("/");
  return {};
}

export async function toggleSave(postId: string): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(postId)) return { error: "Publication inconnue." };
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const existing = await current.supabase.from("saves").select("post_id").eq("user_id", current.userId).eq("post_id", postId).maybeSingle();
  const result = existing.data
    ? await current.supabase.from("saves").delete().eq("user_id", current.userId).eq("post_id", postId)
    : await current.supabase.from("saves").insert({ user_id: current.userId, post_id: postId });
  if (result.error) return { error: "L'enregistrement a échoué." };
  revalidatePath("/");
  return {};
}

export async function reportContent(targetType: string, targetId: string, reason: string, note: string): Promise<ActionState> {
  const allowed = ["post", "comment", "article", "photo", "video", "profile"];
  if (!allowed.includes(targetType) || !/^[A-Za-z0-9-]{1,80}$/.test(targetId) || !isReportReason(reason)) {
    return { error: "Signalement incomplet." };
  }
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const { error } = await current.supabase.from("reports").insert({
    reporter_id: current.userId,
    target_type: targetType,
    target_id: targetId,
    reason,
    note: note.trim().slice(0, 280),
  });
  if (error) return { error: "Ce contenu a déjà été signalé, ou le signalement a échoué." };
  return {};
}

export async function joinCommunity(communityId: string, join: boolean): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(communityId)) return { error: "Communauté inconnue." };
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const result = join
    ? await current.supabase.from("community_members").insert({ community_id: communityId, user_id: current.userId, role: "member" })
    : await current.supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", current.userId);
  if (result.error) return { error: "L'inscription à la communauté a échoué." };
  revalidatePath("/communautes");
  return {};
}

export async function createArticle(formData: FormData): Promise<ActionState> {
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 20000);
  const category = String(formData.get("category") ?? "");
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim().slice(0, 24))
    .filter(Boolean)
    .slice(0, 5);
  if (title.length < 3) return { error: "Le titre est trop court." };
  if (body.length < 20) return { error: "L'article doit contenir au moins quelques phrases." };
  if (!articleCategories.includes(category as (typeof articleCategories)[number])) return { error: "Choisissez une catégorie." };
  if (!("ageBand" in current)) return { auth: true };
  if (isExplicit(`${title}\n${body}\n${tags.join(" ")}`)) return { error: explicitMessage };
  const audience = chosenAudience(formData, current.ageBand);
  if ("error" in audience) return audience;

  let cover = "";
  const file = formData.get("cover");
  if (file instanceof File && file.size > 0) {
    const parsed = await readImage(file);
    if ("error" in parsed) return { error: parsed.error };
    try {
      cover = await uploadNetworkFile(buckets.article, `${current.userId}/${crypto.randomUUID()}.${parsed.extension}`, parsed.body, parsed.mime);
    } catch {
      return { error: "La couverture n'a pas pu être envoyée." };
    }
  }

  const { data, error } = await current.supabase
    .from("community_articles")
    .insert({ user_id: current.userId, title, body, category, tags, cover_url: cover, audience: audience.audience })
    .select("id")
    .single();
  if (error || !data) {
    if (cover) await deleteNetworkFile(cover);
    return { error: publicationError(error?.message ?? "", "L'article n'a pas pu être publié.") };
  }
  revalidatePath("/articles");
  return { id: data.id };
}

async function leaveOtherSchools(userId: string, schoolId: string, supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>) {
  const school = await supabase.from("schools").select("group_id").eq("id", schoolId).maybeSingle();
  if (!school.data) return;
  const group = await supabase.from("community_groups").select("community_id").eq("id", school.data.group_id).maybeSingle();
  if (!group.data) return;
  const groups = await supabase.from("community_groups").select("id").eq("community_id", group.data.community_id);
  const groupIds = (groups.data ?? []).map((row) => row.id);
  if (groupIds.length === 0) return;
  const schools = await supabase.from("schools").select("id").in("group_id", groupIds);
  const ids = (schools.data ?? []).map((row) => row.id).filter((id) => id !== schoolId);
  if (ids.length === 0) return;
  await supabase.from("school_members").delete().eq("user_id", userId).in("school_id", ids);
}

export async function joinSchool(schoolId: string, slug: string): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(schoolId) || !/^[a-z0-9-]{2,40}$/.test(slug)) return { error: "École inconnue." };
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  await leaveOtherSchools(current.userId, schoolId, current.supabase);
  const { error } = await current.supabase.from("school_members").insert({ user_id: current.userId, school_id: schoolId });
  if (error && error.code !== "23505") return { error: publicationError(error.message, "L'inscription à l'école a échoué.") };
  revalidatePath(`/communautes/${slug}`);
  revalidatePath("/publier");
  return {};
}

export async function leaveSchool(schoolId: string, slug: string): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(schoolId) || !/^[a-z0-9-]{2,40}$/.test(slug)) return { error: "École inconnue." };
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const { error } = await current.supabase.from("school_members").delete().eq("user_id", current.userId).eq("school_id", schoolId);
  if (error) return { error: "Vous n'avez pas pu quitter cette école." };
  revalidatePath(`/communautes/${slug}`);
  revalidatePath("/publier");
  return {};
}

export async function addSchool(groupId: string, name: string, slug: string): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(groupId) || !/^[a-z0-9-]{2,40}$/.test(slug)) return { error: "Groupe inconnu." };
  const cleaned = cleanSchoolName(name);
  if ("error" in cleaned) return cleaned;
  const current = await session();
  if ("error" in current) return { error: current.error };
  if (!("userId" in current) || !current.userId) return { auth: true };
  const existing = await current.supabase.from("schools").select("id, name").eq("group_id", groupId);
  let schoolId = existing.data?.find((row) => row.name.toLowerCase() === cleaned.name.toLowerCase())?.id ?? "";
  if (!schoolId) {
    const created = await current.supabase.from("schools").insert({ group_id: groupId, name: cleaned.name }).select("id").single();
    if (created.error || !created.data) {
      const again = await current.supabase.from("schools").select("id, name").eq("group_id", groupId);
      schoolId = again.data?.find((row) => row.name.toLowerCase() === cleaned.name.toLowerCase())?.id ?? "";
      if (!schoolId) return { error: publicationError(created.error?.message ?? "", "L'école n'a pas pu être ajoutée.") };
    } else {
      schoolId = created.data.id;
    }
  }
  return joinSchool(schoolId, slug);
}

export async function markNotificationsRead() {
  const current = await session();
  if (!("userId" in current) || !current.userId) return;
  await current.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", current.userId).is("read_at", null);
}
