import { PAGE_SIZE, type FeedTab } from "@/lib/network/constants";
import { createClient } from "@/lib/supabase/server";

export type FeedAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
};

export type FeedMedia = {
  url: string;
  mediaType: "image" | "video";
  duration: number | null;
};

export type FeedPost = {
  id: string;
  kind: "text" | "photo" | "video";
  body: string;
  createdAt: string;
  communitySlug: string | null;
  communityName: string | null;
  author: FeedAuthor;
  media: FeedMedia | null;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
};

type AuthorRow = { id: string; username: string; display_name: string; avatar_url: string };
type MediaRow = { url: string; media_type: "image" | "video"; duration: number | null };
type CommunityRow = { slug: string; name: string };
type PostRow = {
  id: string;
  kind: "text" | "photo" | "video";
  body: string;
  created_at: string;
  user_id: string;
  profiles: AuthorRow | AuthorRow[] | null;
  post_media: MediaRow | MediaRow[] | null;
  communities: CommunityRow | CommunityRow[] | null;
};

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapPost(row: PostRow, likes: Map<string, number>, comments: Map<string, number>, liked: Set<string>, saved: Set<string>): FeedPost {
  const author = one(row.profiles);
  const media = one(row.post_media);
  const community = one(row.communities);
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at,
    communitySlug: community?.slug ?? null,
    communityName: community?.name ?? null,
    author: {
      id: author?.id || row.user_id,
      username: author?.username || "visiteur",
      displayName: author?.display_name || "Visiteur",
      avatarUrl: author?.avatar_url || "",
    },
    media: media ? { url: media.url, mediaType: media.media_type, duration: media.duration } : null,
    likeCount: likes.get(row.id) ?? 0,
    commentCount: comments.get(row.id) ?? 0,
    liked: liked.has(row.id),
    saved: saved.has(row.id),
  };
}

async function counts(ids: string[], userId: string | null) {
  const supabase = await createClient();
  const likes = new Map<string, number>();
  const comments = new Map<string, number>();
  const liked = new Set<string>();
  const saved = new Set<string>();
  if (!supabase || ids.length === 0) return { likes, comments, liked, saved };
  const [likeRows, commentRows, mine, saves] = await Promise.all([
    supabase.from("likes").select("content_id").eq("content_type", "feed").in("content_id", ids),
    supabase.from("comments").select("content_id").eq("content_type", "feed").in("content_id", ids),
    userId ? supabase.from("likes").select("content_id").eq("content_type", "feed").eq("user_id", userId).in("content_id", ids) : Promise.resolve({ data: [] }),
    userId ? supabase.from("saves").select("post_id").eq("user_id", userId).in("post_id", ids) : Promise.resolve({ data: [] }),
  ]);
  for (const row of likeRows.data ?? []) likes.set(row.content_id, (likes.get(row.content_id) ?? 0) + 1);
  for (const row of commentRows.data ?? []) comments.set(row.content_id, (comments.get(row.content_id) ?? 0) + 1);
  for (const row of mine.data ?? []) liked.add(row.content_id);
  for (const row of saves.data ?? []) saved.add(row.post_id);
  return { likes, comments, liked, saved };
}

export async function loadFeed(tab: FeedTab, page: number) {
  const supabase = await createClient();
  if (!supabase) return { ready: false as const, posts: [], hasMore: false };
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  let query = supabase
    .from("posts")
    .select("id, kind, body, created_at, user_id, profiles!posts_user_id_fkey(id, username, display_name, avatar_url), post_media(url, media_type, duration), communities!posts_community_id_fkey(slug, name)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (tab === "suivis") {
    if (!userId) return { ready: true as const, posts: [], hasMore: false, needsAuth: true };
    const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
    const ids = (follows ?? []).map((row) => row.following_id);
    if (ids.length === 0) return { ready: true as const, posts: [], hasMore: false };
    query = query.in("user_id", ids);
  }
  if (tab === "recent") {
    query = query.gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  }

  const from = tab === "tendances" ? 0 : Math.max(0, page) * PAGE_SIZE;
  const to = tab === "tendances" ? 39 : from + PAGE_SIZE;
  const { data, error } = await query.range(from, to);
  if (error) return { ready: false as const, posts: [], hasMore: false };
  let rows = (data ?? []) as PostRow[];
  const stats = await counts(rows.map((row) => row.id), userId);
  let posts = rows.map((row) => mapPost(row, stats.likes, stats.comments, stats.liked, stats.saved));
  if (tab === "tendances") {
    posts.sort((a, b) => b.likeCount - a.likeCount || +new Date(b.createdAt) - +new Date(a.createdAt));
    const start = Math.max(0, page) * PAGE_SIZE;
    const slice = posts.slice(start, start + PAGE_SIZE + 1);
    return { ready: true as const, posts: slice.slice(0, PAGE_SIZE), hasMore: slice.length > PAGE_SIZE };
  }
  return { ready: true as const, posts: posts.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function loadPost(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("posts")
    .select("id, kind, body, created_at, user_id, profiles!posts_user_id_fkey(id, username, display_name, avatar_url), post_media(url, media_type, duration), communities!posts_community_id_fkey(slug, name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { data: auth } = await supabase.auth.getUser();
  const stats = await counts([id], auth.user?.id ?? null);
  return mapPost(data as PostRow, stats.likes, stats.comments, stats.liked, stats.saved);
}

export async function loadProfilePosts(userId: string, kind?: "photo" | "video") {
  const supabase = await createClient();
  if (!supabase) return [];
  let query = supabase
    .from("posts")
    .select("id, kind, body, created_at, user_id, profiles!posts_user_id_fkey(id, username, display_name, avatar_url), post_media(url, media_type, duration), communities!posts_community_id_fkey(slug, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(24);
  if (kind) query = query.eq("kind", kind);
  const { data } = await query;
  const rows = (data ?? []) as PostRow[];
  const { data: auth } = await supabase.auth.getUser();
  const stats = await counts(rows.map((row) => row.id), auth.user?.id ?? null);
  return rows.map((row) => mapPost(row, stats.likes, stats.comments, stats.liked, stats.saved));
}

export async function loadCommunityPosts(communityId: string) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("posts")
    .select("id, kind, body, created_at, user_id, profiles!posts_user_id_fkey(id, username, display_name, avatar_url), post_media(url, media_type, duration), communities!posts_community_id_fkey(slug, name)")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (data ?? []) as PostRow[];
  const { data: auth } = await supabase.auth.getUser();
  const stats = await counts(rows.map((row) => row.id), auth.user?.id ?? null);
  return rows.map((row) => mapPost(row, stats.likes, stats.comments, stats.liked, stats.saved));
}

export async function loadCommunities() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("communities").select("id, slug, name, description").order("name");
  return data ?? [];
}

export async function loadCommunity(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("communities").select("id, slug, name, description").eq("slug", slug).maybeSingle();
  return data;
}

export async function communityCounts(communityId: string, userId: string | null) {
  const supabase = await createClient();
  if (!supabase) return { members: 0, joined: false };
  const [members, mine] = await Promise.all([
    supabase.from("community_members").select("*", { count: "exact", head: true }).eq("community_id", communityId),
    userId
      ? supabase.from("community_members").select("user_id").eq("community_id", communityId).eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { members: members.count ?? 0, joined: Boolean(mine.data) };
}
