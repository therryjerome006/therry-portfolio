"use server";

import { revalidatePath } from "next/cache";
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
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();
  if (!displayName) return { error: "Indiquez un nom." };
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return { error: "Le nom d'utilisateur utilise 3 à 24 lettres, chiffres ou _." };
  if (avatarUrl && !avatarUrl.startsWith("https://")) return { error: "L'avatar doit être une adresse https." };
  const { error } = await session.supabase
    .from("profiles")
    .update({ display_name: displayName, username, bio, avatar_url: avatarUrl })
    .eq("id", session.userId);
  if (error) return { error: "Ce nom d'utilisateur est peut-être déjà pris." };
  refresh("/profil");
  refresh(`/profil/${username}`);
  return {};
}
