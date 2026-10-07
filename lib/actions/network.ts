"use server";

import { revalidatePath } from "next/cache";
import { articleCategories, isReportReason } from "@/lib/network/constants";
import { buckets, deleteNetworkFile, readImage, readVideo, uploadNetworkFile } from "@/lib/network/media";
import { ensureProfile } from "@/lib/social/queries";
import { createClient } from "@/lib/supabase/server";

type ActionState = { error?: string; auth?: boolean; id?: string };

async function session() {
  const supabase = await createClient();
  if (!supabase) return { error: "Le réseau n'est pas disponible." } as const;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { auth: true, supabase } as const;
  await ensureProfile(supabase, data.user.id);
  const { data: profile } = await supabase.from("profiles").select("suspended_at").eq("id", data.user.id).maybeSingle();
  if (profile?.suspended_at) return { error: "Ce compte est suspendu." } as const;
  return { supabase, userId: data.user.id };
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
      community_id: /^[0-9a-f-]{36}$/i.test(community) ? community : null,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (media) await deleteNetworkFile(media.url);
    return { error: "La publication n'a pas pu être créée." };
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
    .insert({ user_id: current.userId, title, body, category, tags, cover_url: cover })
    .select("id")
    .single();
  if (error || !data) {
    if (cover) await deleteNetworkFile(cover);
    return { error: "L'article n'a pas pu être publié." };
  }
  revalidatePath("/articles");
  return { id: data.id };
}

export async function markNotificationsRead() {
  const current = await session();
  if (!("userId" in current) || !current.userId) return;
  await current.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", current.userId).is("read_at", null);
}
