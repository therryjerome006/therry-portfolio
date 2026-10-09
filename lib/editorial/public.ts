import type { FeedPost } from "@/lib/network/feed";
import { createClient } from "@/lib/supabase/server";

type PublicRow = {
  id: string;
  kind: "text" | "photo" | "video" | "article";
  title: string;
  body: string;
  discussion: string;
  category: string;
  cover_url: string;
  media_url: string;
  media_type: "image" | "video" | null;
  duration: number | null;
  published_at: string;
  editorial_profiles: { id: string; name: string; slug: string; avatar_url: string; description: string; category: string } | { id: string; name: string; slug: string; avatar_url: string; description: string; category: string }[] | null;
};

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toFeed(row: PublicRow, likes: Map<string, number>, comments: Map<string, number>, liked: Set<string>, saved: Set<string>): FeedPost | null {
  if (row.kind === "article") return null;
  const profile = one(row.editorial_profiles);
  if (!profile) return null;
  const mediaType = row.media_type === "image" || row.media_type === "video" ? row.media_type : null;
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.published_at,
    communitySlug: null,
    communityName: null,
    schoolName: null,
    discussion: row.discussion,
    canSave: true,
    author: {
      id: profile.id,
      username: profile.slug,
      displayName: profile.name,
      avatarUrl: profile.avatar_url || "",
      editorial: true,
    },
    media: mediaType && row.media_url ? { url: row.media_url, mediaType, duration: row.duration } : null,
    likeCount: likes.get(row.id) ?? 0,
    commentCount: comments.get(row.id) ?? 0,
    liked: liked.has(row.id),
    saved: saved.has(row.id),
  };
}

async function reactionMaps(ids: string[], userId: string | null) {
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
    userId ? supabase.from("saves").select("editorial_item_id").eq("user_id", userId).in("editorial_item_id", ids) : Promise.resolve({ data: [] }),
  ]);
  for (const row of likeRows.data ?? []) likes.set(row.content_id, (likes.get(row.content_id) ?? 0) + 1);
  for (const row of commentRows.data ?? []) comments.set(row.content_id, (comments.get(row.content_id) ?? 0) + 1);
  for (const row of mine.data ?? []) liked.add(row.content_id);
  for (const row of saves.data ?? []) if (row.editorial_item_id) saved.add(row.editorial_item_id);
  return { likes, comments, liked, saved };
}

export async function loadEditorialFeed(limit: number, since?: string, profileIds?: string[]) {
  const supabase = await createClient();
  if (!supabase) return [];
  if (profileIds && profileIds.length === 0) return [];
  let query = supabase
    .from("editorial_items")
    .select("id, kind, title, body, discussion, category, cover_url, media_url, media_type, duration, published_at, editorial_profiles!editorial_items_profile_id_fkey!inner(id, name, slug, avatar_url, description, category)")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .in("kind", ["text", "photo", "video"])
    .order("published_at", { ascending: false })
    .limit(limit);
  if (since) query = query.gte("published_at", since);
  if (profileIds) query = query.in("profile_id", profileIds);
  const { data, error } = await query;
  if (error || !data) return [];
  const rows = data as PublicRow[];
  const { data: auth } = await supabase.auth.getUser();
  const stats = await reactionMaps(rows.map((row) => row.id), auth.user?.id ?? null);
  return rows.flatMap((row) => {
    const post = toFeed(row, stats.likes, stats.comments, stats.liked, stats.saved);
    return post ? [post] : [];
  });
}

export async function loadEditorialPost(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("editorial_items")
    .select("id, kind, title, body, discussion, category, cover_url, media_url, media_type, duration, published_at, editorial_profiles!editorial_items_profile_id_fkey!inner(id, name, slug, avatar_url, description, category)")
    .eq("id", id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .in("kind", ["text", "photo", "video"])
    .maybeSingle();
  if (error || !data) return null;
  const { data: auth } = await supabase.auth.getUser();
  const stats = await reactionMaps([id], auth.user?.id ?? null);
  return toFeed(data as PublicRow, stats.likes, stats.comments, stats.liked, stats.saved);
}

export async function previousEditorialSlug(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("editorial_slugs").select("profile_id").eq("slug", slug).maybeSingle();
  if (!data?.profile_id) return null;
  const { data: profile } = await supabase.from("editorial_profiles").select("slug").eq("id", data.profile_id).maybeSingle();
  return profile?.slug || null;
}

export async function loadEditorialProfile(slug: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: profile } = await supabase
    .from("editorial_profiles")
    .select("id, name, slug, avatar_url, description, website, category, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!profile) return null;
  const { data } = await supabase
    .from("editorial_items")
    .select("id, kind, title, body, discussion, category, cover_url, media_url, media_type, duration, published_at, editorial_profiles!editorial_items_profile_id_fkey!inner(id, name, slug, avatar_url, description, category)")
    .eq("profile_id", profile.id)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(30);
  const rows = (data ?? []) as PublicRow[];
  const { data: auth } = await supabase.auth.getUser();
  const postRows = rows.filter((row) => row.kind !== "article");
  const stats = await reactionMaps(postRows.map((row) => row.id), auth.user?.id ?? null);
  return {
    profile,
    posts: postRows.flatMap((row) => {
      const post = toFeed(row, stats.likes, stats.comments, stats.liked, stats.saved);
      return post ? [post] : [];
    }),
    articles: rows
      .filter((row) => row.kind === "article")
      .map((row) => ({
        id: row.id,
        title: row.title,
        excerpt: row.body.replace(/\s+/g, " ").trim().slice(0, 180),
        cover: row.cover_url || "",
        category: row.category || "",
        publishedAt: row.published_at,
      })),
  };
}

export async function loadEditorialArticles() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("editorial_items")
    .select("id, title, body, category, cover_url, published_at, editorial_profiles!editorial_items_profile_id_fkey!inner(name, slug)")
    .eq("status", "published")
    .eq("kind", "article")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(40);
  if (error || !data) return [];
  return data.map((row) => {
    const profile = Array.isArray(row.editorial_profiles) ? row.editorial_profiles[0] : row.editorial_profiles;
    return {
      id: row.id as string,
      title: row.title as string,
      body: row.body as string,
      category: (row.category as string) || "Culture",
      coverUrl: (row.cover_url as string) || "",
      publishedAt: row.published_at as string,
      author: profile?.name || "TY Space",
      authorHref: profile?.slug ? `/redaction/${profile.slug}` : "/articles",
    };
  });
}

export async function loadEditorialArticle(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("editorial_items")
    .select("id, title, body, category, cover_url, published_at, editorial_profiles!editorial_items_profile_id_fkey!inner(name, slug)")
    .eq("id", id)
    .eq("kind", "article")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  const profile = Array.isArray(data.editorial_profiles) ? data.editorial_profiles[0] : data.editorial_profiles;
  return {
    id: data.id as string,
    title: data.title as string,
    body: data.body as string,
    category: (data.category as string) || "Culture",
    tags: [] as string[],
    coverUrl: (data.cover_url as string) || "",
    createdAt: data.published_at as string,
    displayName: profile?.name || "TY Space",
    username: "",
    authorHref: profile?.slug ? `/redaction/${profile.slug}` : "/articles",
    editorial: true,
  };
}

export async function loadEditorialDirectory() {
  const supabase = await createClient();
  if (!supabase) return [];
  const [{ data: profiles }, { data: follows }] = await Promise.all([
    supabase.from("editorial_profiles").select("id, name, slug, avatar_url, description, category, is_active").eq("is_active", true).order("name"),
    supabase.from("follows").select("editorial_id").not("editorial_id", "is", null),
  ]);
  const counts = new Map<string, number>();
  for (const row of follows ?? []) {
    if (!row.editorial_id) continue;
    counts.set(row.editorial_id, (counts.get(row.editorial_id) ?? 0) + 1);
  }
  return (profiles ?? []).map((profile) => ({
    id: profile.id as string,
    name: profile.name as string,
    slug: profile.slug as string,
    avatarUrl: (profile.avatar_url as string) || "",
    description: (profile.description as string) || "",
    category: profile.category as string,
    followers: counts.get(profile.id) ?? 0,
  }));
}

export async function loadFollowedEditorial(userId: string) {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: follows } = await supabase.from("follows").select("editorial_id").eq("follower_id", userId).not("editorial_id", "is", null);
  const ids = (follows ?? []).map((row) => row.editorial_id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];
  const { data } = await supabase.from("editorial_profiles").select("id, name, slug, avatar_url, description, category").in("id", ids).order("name");
  return (data ?? []).map((profile) => ({
    id: profile.id as string,
    name: profile.name as string,
    slug: profile.slug as string,
    avatarUrl: (profile.avatar_url as string) || "",
    description: (profile.description as string) || "",
    category: (profile.category as string) || "",
  }));
}
