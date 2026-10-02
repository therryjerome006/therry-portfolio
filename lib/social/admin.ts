import { dbPool } from "@/lib/media/db";

export type AdminComment = {
  id: string;
  body: string;
  contentType: string;
  contentId: string;
  createdAt: string;
  author: string;
};

export async function communityStats() {
  const db = dbPool();
  if (!db) return { profiles: 0, comments: 0, likes: 0, commentsList: [] as AdminComment[] };
  try {
    const [counts, comments] = await Promise.all([
      db.query(`select
        (select count(*)::int from public.profiles) as profiles,
        (select count(*)::int from public.comments) as comments,
        (select count(*)::int from public.likes) as likes`),
      db.query(
        `select comments.id, comments.body, comments.content_type, comments.content_id, comments.created_at,
                profiles.display_name
         from public.comments
         join public.profiles on profiles.id = comments.user_id
         order by comments.created_at desc
         limit 40`,
      ),
    ]);
    const row = counts.rows[0] ?? {};
    return {
      profiles: Number(row.profiles) || 0,
      comments: Number(row.comments) || 0,
      likes: Number(row.likes) || 0,
      commentsList: comments.rows.map((item) => ({
        id: String(item.id),
        body: String(item.body),
        contentType: String(item.content_type),
        contentId: String(item.content_id),
        createdAt: String(item.created_at),
        author: String(item.display_name),
      })),
    };
  } catch (error) {
    console.error("community", error instanceof Error ? error.message : "query");
    return { profiles: 0, comments: 0, likes: 0, commentsList: [] as AdminComment[] };
  }
}
