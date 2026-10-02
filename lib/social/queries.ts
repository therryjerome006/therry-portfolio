import type { SupabaseClient } from "@supabase/supabase-js";
import { COMMENT_PAGE, type ContentType } from "@/lib/social/content";
import { createClient } from "@/lib/supabase/server";

export type CommentAuthor = {
  displayName: string;
  username: string;
  avatarUrl: string;
};

export type PublicComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  userId: string;
  author: CommentAuthor;
};

export type EngagementData = {
  configured: true;
  userId: string | null;
  count: number;
  liked: boolean;
  comments: PublicComment[];
  hasMore: boolean;
};

type ProfileEmbed = { display_name: string; username: string; avatar_url: string };

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  user_id: string;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

function authorOf(row: CommentRow): CommentAuthor {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    displayName: profile?.display_name || "Visiteur",
    username: profile?.username || "visiteur",
    avatarUrl: profile?.avatar_url || "",
  };
}

function mapComment(row: CommentRow): PublicComment {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentId: row.parent_id,
    userId: row.user_id,
    author: authorOf(row),
  };
}

async function currentUserId(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadEngagement(type: ContentType, id: string): Promise<EngagementData | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const userId = await currentUserId(supabase);
  const [countResult, likedResult, commentsResult] = await Promise.all([
    supabase.from("likes").select("*", { count: "exact", head: true }).eq("content_type", type).eq("content_id", id),
    userId
      ? supabase.from("likes").select("user_id").eq("content_type", type).eq("content_id", id).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("comments")
      .select("id, body, created_at, updated_at, parent_id, user_id, profiles(display_name, username, avatar_url)")
      .eq("content_type", type)
      .eq("content_id", id)
      .order("created_at", { ascending: true })
      .range(0, COMMENT_PAGE),
  ]);

  const comments = ((commentsResult.data ?? []) as CommentRow[]).map(mapComment);
  return {
    configured: true,
    userId,
    count: countResult.count ?? 0,
    liked: Boolean(likedResult.data),
    comments: comments.slice(0, COMMENT_PAGE),
    hasMore: comments.length > COMMENT_PAGE,
  };
}

export async function loadMoreComments(type: ContentType, id: string, offset: number) {
  const supabase = await createClient();
  if (!supabase) return { comments: [] as PublicComment[], hasMore: false };
  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, updated_at, parent_id, user_id, profiles(display_name, username, avatar_url)")
    .eq("content_type", type)
    .eq("content_id", id)
    .order("created_at", { ascending: true })
    .range(offset, offset + COMMENT_PAGE);
  const comments = ((data ?? []) as CommentRow[]).map(mapComment);
  return { comments: comments.slice(0, COMMENT_PAGE), hasMore: comments.length > COMMENT_PAGE };
}

export async function ensureProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("profiles").select("id, username, display_name, bio, avatar_url").eq("id", userId).maybeSingle();
  if (data) return data;
  const { data: auth } = await supabase.auth.getUser();
  const displayName = String(auth.user?.user_metadata?.display_name || "Visiteur").trim().slice(0, 40) || "Visiteur";
  const username = `u${userId.replaceAll("-", "").slice(0, 12)}`;
  const { error } = await supabase.from("profiles").insert({ id: userId, display_name: displayName, username });
  if (error) return null;
  return { id: userId, username, display_name: displayName, bio: "", avatar_url: "" };
}

export type PublicProfile = {
  id: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  createdAt: string;
};

export async function getProfileByUsername(username: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio, avatar_url, created_at")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    username: data.username,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
  } satisfies PublicProfile;
}

export async function getOwnProfile() {
  const supabase = await createClient();
  if (!supabase) return null;
  const userId = await currentUserId(supabase);
  if (!userId) return null;
  const profile = await ensureProfile(supabase, userId);
  if (!profile) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    username: data.username,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
  } satisfies PublicProfile;
}
