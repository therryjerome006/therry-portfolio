import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { ArticleFrame } from "@/components/journal/ArticleFrame";
import { ReportButton } from "@/components/network/ReportButton";
import { Engagement } from "@/components/social/Engagement";
import { readingMinutes } from "@/lib/blog/posts";
import { loadEditorialArticle } from "@/lib/editorial/public";
import { formatDate } from "@/lib/format";
import { loadJournal } from "@/lib/journal/items";
import { getSiteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await loadArticle((await params).id);
  if (!article) return {};
  const path = `/articles/${article.id}`;
  const description = article.body.replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    title: article.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      url: path,
      publishedTime: article.createdAt,
      images: article.coverUrl ? [article.coverUrl] : undefined,
    },
  };
}

export default async function CommunityArticlePage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const article = await loadArticle(id);
  if (!article) notFound();

  const path = `/articles/${article.id}`;
  const items = await loadJournal();
  const index = items.findIndex((item) => item.href === path);
  const related = [
    ...items.filter((item) => item.href !== path && item.category === article.category),
    ...items.filter((item) => item.href !== path && item.category !== article.category),
  ].slice(0, 5);
  const description = article.body.replace(/\s+/g, " ").trim().slice(0, 160);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description,
    datePublished: article.createdAt,
    author: { "@type": article.editorial ? "Organization" : "Person", name: article.displayName },
    image: article.coverUrl || undefined,
    mainEntityOfPage: `${getSiteUrl()}${path}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleFrame
        category={article.category}
        title={article.title}
        author={article.displayName}
        authorHref={article.authorHref}
        date={article.createdAt}
        dateLabel={formatDate(article.createdAt)}
        minutes={readingMinutes(article.body)}
        shareUrl={`${getSiteUrl()}${path}`}
        cover={article.coverUrl}
        excerpt={description}
        previous={index >= 0 && items[index + 1] ? { href: items[index + 1].href, title: items[index + 1].title } : null}
        next={index > 0 ? { href: items[index - 1].href, title: items[index - 1].title } : null}
        related={related}
      >
        <ArticleContent content={article.body.replace(/([^\n])\n(?!\n)/g, "$1  \n")} />
        {article.tags.length > 0 ? (
          <p className="mt-6 text-sm text-muted">{article.tags.map((tag) => `#${tag}`).join(" ")}</p>
        ) : null}
        <div className="mt-4">
          <ReportButton targetType="article" targetId={article.id} path={path} />
        </div>
        <div className="mt-6">
          <Engagement type="article" id={article.id} path={path} />
        </div>
      </ArticleFrame>
    </>
  );
}

async function loadArticle(id: string) {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("community_articles")
    .select("id, title, body, category, tags, cover_url, created_at, profiles!community_articles_user_id_fkey(display_name, username)")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (data) {
    const author = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
    const username = author?.username || "";
    return {
      id: data.id as string,
      title: data.title as string,
      body: data.body as string,
      category: data.category as string,
      tags: (data.tags as string[]) ?? [],
      coverUrl: (data.cover_url as string) || "",
      createdAt: data.created_at as string,
      displayName: author?.display_name || "Membre",
      username,
      authorHref: username ? `/profil/${username}` : "/articles",
      editorial: false,
    };
  }
  return loadEditorialArticle(id);
}
