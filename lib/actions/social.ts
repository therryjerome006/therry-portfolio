"use server";

import { revalidatePath } from "next/cache";
import { buckets, deleteNetworkFile, readAvatar, uploadNetworkFile } from "@/lib/network/media";
import { isContentId, isContentType, safeNext } from "@/lib/social/content";
import { ensureProfile, loadMoreComments } from "@/lib/social/queries";
import { createClient } from "@/lib/supabase/server";

export type SocialState = { error?: string; auth?: boolean };

async function viewer() {
  const supabase = await createClient();
  if (!supabase) return { error: "Les interactions ne sont pas disponibles." } as const;
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return { auth: true, supabase } as const;
  return { supabase, userId };
}

function refresh(path: string) {
  revalidatePath(safeNext(path));
}

export async function toggleLike(type: string, id: string, path: string): Promise<SocialState> {
  if (!isContentType(type) || !isContentId(id)) return { error: "Contenu inconnu." };
  const session = await viewer();
  if ("error" in session) return { error: session.error };
  if (!("userId" in session) || !session.userId) return { auth: true };
  await ensureProfile(session.supabase, session.userId);
  const existing = await session.supabase
    .from("likes")
    .select("user_id")
    .eq("user_id", session.userId)
    .eq("content_type", type)
    .eq("content_id", id)
    .maybeSingle();
  const result = existing.data
    ? await session.supabase.from("likes").delete().eq("user_id", session.userId).eq("content_type", type).eq("content_id", id)
    : await session.supabase.from("likes").insert({ user_id: session.userId, content_type: type, content_id: id });
  if (result.error) return { error: "Le j'aime n'a pas pu être enregistré." };
  refresh(path);
  return {};
}

export async function addComment(type: string, id: string, body: string, parentId: string | null, path: string): Promise<SocialState> {
  if (!isContentType(type) || !isContentId(id)) return { error: "Contenu inconnu." };
  const text = body.trim().slice(0, 2000);
  if (!text) return { error: "Écrivez un commentaire." };
  const session = await viewer();
  if ("error" in session) return { error: session.error };
  if (!("userId" in session) || !session.userId) return { auth: true };
  await ensureProfile(session.supabase, session.userId);
  const { error } = await session.supabase.from("comments").insert({
    user_id: session.userId,
    content_type: type,
    content_id: id,
    parent_id: parentId || null,
    body: text,
  });
  if (error) return { error: "Le commentaire n'a pas pu être publié." };
  refresh(path);
  return {};
}

export async function editComment(commentId: string, body: string, path: string): Promise<SocialState> {
  const text = body.trim().slice(0, 2000);
  if (!text) return { error: "Le commentaire ne peut pas être vide." };
  const session = await viewer();
  if ("error" in session) return { error: session.error };
  if (!("userId" in session)) return { auth: true };
  const { error } = await session.supabase.from("comments").update({ body: text }).eq("id", commentId).eq("user_id", session.userId);
  if (error) return { error: "La modification a échoué." };
  refresh(path);
  return {};
}

export async function removeComment(commentId: string, path: string): Promise<SocialState> {
  const session = await viewer();
  if ("error" in session) return { error: session.error };
  if (!("userId" in session)) return { auth: true };
  const { error } = await session.supabase.from("comments").delete().eq("id", commentId).eq("user_id", session.userId);
  if (error) return { error: "La suppression a échoué." };
  refresh(path);
  return {};
}

export async function moreComments(type: string, id: string, offset: number) {
  if (!isContentType(type) || !isContentId(id) || offset < 0) return { comments: [], hasMore: false };
  return loadMoreComments(type, id, offset);
}

export async function updateProfile(formData: FormData): Promise<SocialState> {
  const session = await viewer();
  if ("error" in session) return { error: session.error };
  if (!("userId" in session)) return { auth: true };
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 40);
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 280);
  const interests = String(formData.get("interests") ?? "").trim().slice(0, 160);
  const ageBand = String(formData.get("ageBand") ?? "");
  const file = formData.get("avatar");
  const removeAvatar = formData.get("removeAvatar") === "on";
  if (!displayName) return { error: "Indiquez un nom." };
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return { error: "Le nom d'utilisateur utilise 3 à 24 lettres, chiffres ou _." };
  const { data: current } = await session.supabase.from("profiles").select("avatar_url").eq("id", session.userId).maybeSingle();
  const previous = current?.avatar_url || "";
  let uploaded = "";
  const patch: { display_name: string; username: string; bio: string; interests: string; avatar_url?: string; age_band?: string } = {
    display_name: displayName,
    username,
    bio,
    interests,
  };
  if (file instanceof File && file.size > 0) {
    const parsed = await readAvatar(file);
    if ("error" in parsed) return { error: parsed.error };
    try {
      uploaded = await uploadNetworkFile(buckets.avatar, `${session.userId}/${crypto.randomUUID()}.${parsed.extension}`, parsed.body, parsed.mime);
      patch.avatar_url = uploaded;
    } catch {
      return { error: "L'envoi de la photo a échoué." };
    }
  } else if (removeAvatar) {
    patch.avatar_url = "";
  }
  if (["12-15", "16-17", "18-22", "23+"].includes(ageBand)) patch.age_band = ageBand;
  const { error } = await session.supabase.from("profiles").update(patch).eq("id", session.userId);
  if (error) {
    if (uploaded) await deleteNetworkFile(uploaded);
    return { error: "Ce nom d'utilisateur est peut-être déjà pris." };
  }
  if (patch.avatar_url !== undefined && previous && previous !== patch.avatar_url) await deleteNetworkFile(previous);
  refresh("/profil");
  refresh(`/profil/${username}`);
  refresh("/");
  return {};
}
