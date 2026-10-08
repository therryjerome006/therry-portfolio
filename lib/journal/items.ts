import { profile } from "@/data/profile";
import { getPublishedPosts, readingMinutes } from "@/lib/blog/posts";
import { loadEditorialArticles } from "@/lib/editorial/public";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type JournalItem = {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  category: string;
  cover: string;
  author: string;
  authorHref: string;
  date: string;
  dateLabel: string;
  minutes: number;
  source: "blog" | "community";
};

type ArticleRow = {
  id: string;
  title: string;
  body: string;
  category: string;
  cover_url: string | null;
  created_at: string;
  profiles: { display_name: string; username: string } | { display_name: string; username: string }[] | null;
};

function excerptFrom(text: string) {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 180 ? `${plain.slice(0, 177).trim()}…` : plain;
}

export async function loadJournal(): Promise<JournalItem[]> {
  const supabase = await createClient();
  const [posts, community, editorial] = await Promise.all([
    getPublishedPosts(),
    supabase
      ? supabase
          .from("community_articles")
          .select("id, title, body, category, cover_url, created_at, profiles!community_articles_user_id_fkey(display_name, username)")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as ArticleRow[] }),
    loadEditorialArticles(),
  ]);

  const blogItems: JournalItem[] = posts.map((post) => {
    const date = post.publishedAt || post.updatedAt;
    return {
      id: post.slug,
      href: `/blog/${post.slug}`,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      cover: post.coverImage,
      author: profile.name,
      authorHref: "/developpeur",
      date,
      dateLabel: formatDate(date),
      minutes: readingMinutes(post.content),
      source: "blog",
    };
  });

  const rows = (community.data ?? []) as ArticleRow[];
  const communityItems: JournalItem[] = rows.map((row) => {
    const author = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const username = author?.username || "";
    return {
      id: row.id,
      href: `/articles/${row.id}`,
      title: row.title,
      excerpt: excerptFrom(row.body),
      category: row.category,
      cover: row.cover_url || "",
      author: author?.display_name || "Membre",
      authorHref: username ? `/profil/${username}` : "/articles",
      date: row.created_at,
      dateLabel: formatDate(row.created_at),
      minutes: readingMinutes(row.body),
      source: "community",
    };
  });

  const editorialItems: JournalItem[] = editorial.map((article) => ({
    id: article.id,
    href: `/articles/${article.id}`,
    title: article.title,
    excerpt: excerptFrom(article.body),
    category: article.category,
    cover: article.coverUrl,
    author: article.author,
    authorHref: article.authorHref,
    date: article.publishedAt,
    dateLabel: formatDate(article.publishedAt),
    minutes: readingMinutes(article.body),
    source: "community",
  }));

  return [...blogItems, ...communityItems, ...editorialItems].sort((a, b) => (a.date < b.date ? 1 : -1));
}
