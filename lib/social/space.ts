import { loadEditorialPost, loadFollowedEditorial } from "@/lib/editorial/public";
import { loadProfilePosts } from "@/lib/network/feed";
import { createClient } from "@/lib/supabase/server";

export async function loadPublicRelations(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  if (!supabase) return { followers: [] as { id: string; username: string; name: string }[], following: [] as { id: string; username: string; name: string }[] };
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("follower_id").eq("following_id", userId).order("created_at", { ascending: false }).limit(40),
    supabase.from("follows").select("following_id").eq("follower_id", userId).not("following_id", "is", null).order("created_at", { ascending: false }).limit(40),
  ]);
  const followerIds = (followers.data ?? []).map((row) => row.follower_id as string);
  const followingIds = (following.data ?? []).map((row) => row.following_id).filter((id): id is string => Boolean(id));
  const ids = [...new Set([...followerIds, ...followingIds])];
  const { data } = ids.length ? await supabase.from("profiles").select("id, username, display_name").in("id", ids) : { data: [] as { id: string; username: string; display_name: string }[] };
  const byId = new Map((data ?? []).map((profile) => [profile.id, profile]));
  const named = (id: string) => {
    const profile = byId.get(id);
    return profile ? { id, username: profile.username, name: profile.display_name } : null;
  };
  return {
    followers: followerIds.flatMap((id) => {
      const profile = named(id);
      return profile ? [profile] : [];
    }),
    following: followingIds.flatMap((id) => {
      const profile = named(id);
      return profile ? [profile] : [];
    }),
  };
}

export async function relationCounts(userId: string) {
  const supabase = await createClient();
  if (!supabase) return { followers: 0, following: 0 };
  const [followers, following] = await Promise.all([
    supabase.rpc("profile_relation_count", { person: userId, kind: "followers" }),
    supabase.rpc("profile_relation_count", { person: userId, kind: "following" }),
  ]);
  return { followers: Number(followers.data) || 0, following: Number(following.data) || 0 };
}

export async function loadOwnHub(userId: string) {
  const supabase = await createClient();
  const [posts, photos, videos] = await Promise.all([
    loadProfilePosts(userId),
    loadProfilePosts(userId, "photo"),
    loadProfilePosts(userId, "video"),
  ]);
  if (!supabase) {
    return { publicationCount: posts.length, posts, photos, videos, articles: [], comments: [], replies: [], likes: [], saved: [], followers: [], following: [], editorial: [], blocked: [] };
  }
  const [publicationCount, articles, comments, likes, saves, followers, following, editorial, blocks] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "published"),
    supabase.from("community_articles").select("id, title, created_at").eq("user_id", userId).eq("status", "published").order("created_at", { ascending: false }).limit(20),
    supabase.from("comments").select("id, body, content_type, content_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("likes").select("content_type, content_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("saves").select("post_id, editorial_item_id").eq("user_id", userId).limit(30),
    supabase.from("follows").select("follower_id").eq("following_id", userId).order("created_at", { ascending: false }).limit(40),
    supabase.from("follows").select("following_id").eq("follower_id", userId).not("following_id", "is", null).order("created_at", { ascending: false }).limit(40),
    loadFollowedEditorial(userId),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", userId).limit(40),
  ]);
  const commentIds = (comments.data ?? []).map((row) => row.id);
  const { data: replies } = commentIds.length
    ? await supabase.from("comments").select("id, body, content_type, content_id, created_at").in("parent_id", commentIds).order("created_at", { ascending: false }).limit(20)
    : { data: [] };
  const savedPosts = (saves.data ?? []).map((row) => row.post_id).filter((id): id is string => Boolean(id));
  const savedEditorial = (saves.data ?? []).map((row) => row.editorial_item_id).filter((id): id is string => Boolean(id));
  const { data: savedPostRows } = savedPosts.length
    ? await supabase.from("posts").select("id, body").in("id", savedPosts).eq("status", "published")
    : { data: [] as { id: string; body: string }[] };
  const savedCards = (savedPostRows ?? []).map((post) => ({ id: post.id, href: `/p/${post.id}`, title: post.body.slice(0, 80) || "Publication" }));
  for (const id of savedEditorial) {
    const post = await loadEditorialPost(id);
    if (post) savedCards.push({ id: post.id, href: `/p/${post.id}`, title: post.body.slice(0, 80) || "Publication éditoriale" });
  }
  const blockedIds = (blocks.data ?? []).map((row) => row.blocked_id);
  const followerIds = (followers.data ?? []).map((row) => row.follower_id as string);
  const followingIds = (following.data ?? []).map((row) => row.following_id).filter((id): id is string => Boolean(id));
  const peopleIds = [...new Set([...blockedIds, ...followerIds, ...followingIds])];
  const { data: people } = peopleIds.length
    ? await supabase.from("profiles").select("id, username, display_name").in("id", peopleIds)
    : { data: [] as { id: string; username: string; display_name: string }[] };
  const byId = new Map((people ?? []).map((profile) => [profile.id, profile]));
  const named = (id: string) => {
    const profile = byId.get(id);
    return profile ? { id, username: profile.username, name: profile.display_name } : null;
  };

  return {
    publicationCount: publicationCount.count ?? 0,
    posts,
    photos,
    videos,
    articles: articles.data ?? [],
    comments: comments.data ?? [],
    replies: replies ?? [],
    likes: likes.data ?? [],
    saved: savedCards,
    followers: followerIds.flatMap((id) => {
      const profile = named(id);
      return profile ? [profile] : [];
    }),
    following: followingIds.flatMap((id) => {
      const profile = named(id);
      return profile ? [profile] : [];
    }),
    editorial,
    blocked: blockedIds.flatMap((id) => {
      const profile = named(id);
      return profile ? [profile] : [];
    }),
  };
}
