"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { buckets, deleteNetworkFile, readAvatar, uploadNetworkFile } from "@/lib/network/media";
import { isExplicit, explicitMessage } from "@/lib/network/safety";
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
  const website = cleanWebsite(String(formData.get("website") ?? ""));
  const ageBand = String(formData.get("ageBand") ?? "");
  const showRelations = formData.get("showRelations") === "on";
  const file = formData.get("avatar");
  const removeAvatar = formData.get("removeAvatar") === "on";
  if (!displayName) return { error: "Indiquez un nom." };
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return { error: "Le nom d'utilisateur utilise 3 à 24 lettres, chiffres ou _." };
  if (reservedUsernames.has(username)) return { error: "Ce nom d'utilisateur est réservé." };
  if (website == null) return { error: "Le lien doit commencer par https://." };
  if (isExplicit(`${displayName} ${bio} ${interests} ${website}`)) return { error: explicitMessage };
  const { data: current } = await session.supabase.from("profiles").select("avatar_url, username").eq("id", session.userId).maybeSingle();
  const previous = current?.avatar_url || "";
  const previousName = String(current?.username || "");
  if (previousName && previousName !== username) {
    const { data: taken } = await session.supabase.from("profiles").select("id").eq("username", username).neq("id", session.userId).maybeSingle();
    const { data: historic } = await session.supabase.from("profile_names").select("profile_id").eq("username", username).maybeSingle();
    if (taken || (historic && historic.profile_id !== session.userId)) return { error: "Ce nom d'utilisateur est déjà utilisé." };
    const { error: historyError } = await session.supabase.from("profile_names").insert({ username: previousName, profile_id: session.userId });
    if (historyError) return { error: "L'ancien nom d'utilisateur n'a pas pu être conservé." };
  }
  let uploaded = "";
  const patch: { display_name: string; username: string; bio: string; interests: string; website: string; show_relations: boolean; avatar_url?: string; age_band?: string } = {
    display_name: displayName,
    username,
    bio,
    interests,
    website,
    show_relations: showRelations,
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
    if (previousName && previousName !== username) {
      await session.supabase.from("profile_names").delete().eq("username", previousName).eq("profile_id", session.userId);
    }
    return { error: "Ce nom d'utilisateur est peut-être déjà pris." };
  }
  if (patch.avatar_url !== undefined && previous && previous !== patch.avatar_url) await deleteNetworkFile(previous);
  refresh("/profil");
  refresh(`/profil/${username}`);
  refresh("/");
  return {};
}

const reservedUsernames = new Set(["admin", "support", "officiel", "redaction", "api", "null", "profil", "compte"]);

function cleanWebsite(value: string) {
  const site = value.trim().slice(0, 120);
  if (!site) return "";
  try {
    const url = new URL(site);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString().slice(0, 120);
  } catch {
    return null;
  }
}

export async function updateOwnPost(formData: FormData): Promise<SocialState> {
  const session = await viewer();
  if ("error" in session) return { error: session.error };
  if (!("userId" in session) || !session.userId) return { auth: true };
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 500);
  if (!/^[0-9a-f-]{36}$/i.test(id) || body.length < 1) return { error: "Le texte doit contenir entre 1 et 500 caractères." };
  if (isExplicit(body)) return { error: explicitMessage };
  const { error } = await session.supabase.from("posts").update({ body }).eq("id", id).eq("user_id", session.userId).eq("kind", "text");
  if (error) return { error: "La publication n'a pas pu être modifiée." };
  refresh("/");
  refresh(`/p/${id}`);
  refresh("/profil");
  return {};
}

export async function deleteOwnAccount(formData: FormData): Promise<SocialState> {
  const session = await viewer();
  if ("error" in session) return { error: session.error };
  if (!("userId" in session) || !session.userId) return { auth: true };
  const { data: profile } = await session.supabase.from("profiles").select("username").eq("id", session.userId).maybeSingle();
  const username = String(profile?.username || "");
  if (!username || String(formData.get("confirm") ?? "").trim().toLowerCase() !== username) {
    return { error: "Écrivez votre nom d'utilisateur pour confirmer." };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return { error: "La suppression du compte n'est pas disponible." };
  const admin = createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(session.userId);
  if (error) return { error: "Le compte n'a pas pu être supprimé." };
  await session.supabase.auth.signOut();
  refresh("/");
  return {};
}
