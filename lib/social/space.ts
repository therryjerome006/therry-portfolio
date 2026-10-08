import { loadFollowedEditorial } from "@/lib/editorial/public";
import { loadPostsByIds, loadProfilePosts, type FeedPost } from "@/lib/network/feed";
import { createClient } from "@/lib/supabase/server";

export type ProfilePerson = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
};

export type ProfileArticle = {
  id: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
};

export type ProfileNote = {
  id: string;
  body: string;
  createdAt: string;
  post: FeedPost | null;
  article: ProfileArticle | null;
};

function excerpt(text: string) {
  const plain = text.replace(/[#>*_`[\]]/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > 180 ? `${plain.slice(0, 177).trim()}…` : plain;
}

function articleFrom(row: { id: string; title: string; body: string; cover_url: string | null; category: string | null }): ProfileArticle {
  return {
    id: row.id,
    title: row.title,
    excerpt: excerpt(row.body),
    cover: row.cover_url || "",
    category: row.category || "",
  };
}

export async function loadPublicRelations(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  if (!supabase) return { followers: [] as ProfilePerson[], following: [] as ProfilePerson[] };
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("follower_id").eq("following_id", userId).order("created_at", { ascending: false }).limit(40),
    supabase.from("follows").select("following_id").eq("follower_id", userId).not("following_id", "is", null).order("created_at", { ascending: false }).limit(40),
  ]);
  const followerIds = (followers.data ?? []).map((row) => row.follower_id as string);
  const followingIds = (following.data ?? []).map((row) => row.following_id).filter((id): id is string => Boolean(id));
  const ids = [...new Set([...followerIds, ...followingIds])];
  const { data } = ids.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url, bio").in("id", ids)
    : { data: [] as { id: string; username: string; display_name: string; avatar_url: string | null; bio: string | null }[] };
  const byId = new Map((data ?? []).map((profile) => [profile.id, profile]));
  const named = (id: string): ProfilePerson | null => {
    const profile = byId.get(id);
    return profile
      ? { id, username: profile.username, name: profile.display_name, avatarUrl: profile.avatar_url || "", bio: profile.bio || "" }
      : null;
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
    return { publicationCount: posts.length, posts, photos, videos, articles: [] as ProfileArticle[], comments: [] as ProfileNote[], replies: [] as ProfileNote[], likes: [] as FeedPost[], saved: [] as FeedPost[], savedArticles: [] as ProfileArticle[], followers: [] as ProfilePerson[], following: [] as ProfilePerson[], editorial: [], blocked: [] as ProfilePerson[] };
  }
  const [publicationCount, articles, comments, likes, saves, followers, following, editorial, blocks] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "published"),
    supabase.from("community_articles").select("id, title, body, category, cover_url, created_at").eq("user_id", userId).eq("status", "published").order("created_at", { ascending: false }).limit(20),
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
  const savedIds = [
    ...(saves.data ?? []).map((row) => row.post_id),
    ...(saves.data ?? []).map((row) => row.editorial_item_id),
  ].filter((id): id is string => Boolean(id));
  const likeIds = (likes.data ?? []).map((row) => row.content_id);
  const noteRows = [...(comments.data ?? []), ...(replies ?? [])];
  const noteIds = noteRows.map((row) => row.content_id);
  const [savedPosts, likedPosts, notedPosts] = await Promise.all([
    loadPostsByIds(savedIds),
    loadPostsByIds(likeIds),
    loadPostsByIds(noteIds),
  ]);
  const savedFound = new Set(savedPosts.map((post) => post.id));
  const missingSaved = savedIds.filter((id) => !savedFound.has(id));
  const { data: savedArticleRows } = missingSaved.length
    ? await supabase.from("editorial_items").select("id, title, body, category, cover_url").in("id", missingSaved).eq("kind", "article").eq("status", "published")
    : { data: [] as { id: string; title: string; body: string; category: string | null; cover_url: string | null }[] };
  const notedFound = new Set(notedPosts.map((post) => post.id));
  const missingArticles = [...new Set(noteIds.filter((id) => !notedFound.has(id) && /^[0-9a-f-]{36}$/i.test(id)))];
  const { data: noteArticles } = missingArticles.length
    ? await supabase.from("community_articles").select("id, title, body, category, cover_url").in("id", missingArticles).eq("status", "published")
    : { data: [] as { id: string; title: string; body: string; category: string | null; cover_url: string | null }[] };
  const postById = new Map(notedPosts.map((post) => [post.id, post]));
  const articleById = new Map((noteArticles ?? []).map((row) => [row.id, articleFrom(row)]));
  const asNote = (row: { id: string; body: string; content_id: string; created_at: string }): ProfileNote => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    post: postById.get(row.content_id) ?? null,
    article: articleById.get(row.content_id) ?? null,
  });
  const blockedIds = (blocks.data ?? []).map((row) => row.blocked_id);
  const followerIds = (followers.data ?? []).map((row) => row.follower_id as string);
  const followingIds = (following.data ?? []).map((row) => row.following_id).filter((id): id is string => Boolean(id));
  const peopleIds = [...new Set([...blockedIds, ...followerIds, ...followingIds])];
  const { data: people } = peopleIds.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url, bio").in("id", peopleIds)
    : { data: [] as { id: string; username: string; display_name: string; avatar_url: string | null; bio: string | null }[] };
  const byId = new Map((people ?? []).map((profile) => [profile.id, profile]));
  const named = (id: string): ProfilePerson | null => {
    const profile = byId.get(id);
    return profile
      ? { id, username: profile.username, name: profile.display_name, avatarUrl: profile.avatar_url || "", bio: profile.bio || "" }
      : null;
  };

  return {
    publicationCount: publicationCount.count ?? 0,
    posts,
    photos,
    videos,
    articles: (articles.data ?? []).map((row) => articleFrom(row)),
    comments: (comments.data ?? []).map(asNote),
    replies: (replies ?? []).map(asNote),
    likes: likedPosts,
    saved: savedPosts,
    savedArticles: (savedArticleRows ?? []).map((row) => articleFrom(row)),
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
