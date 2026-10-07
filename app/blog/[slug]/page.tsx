import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { ArticleFrame } from "@/components/journal/ArticleFrame";
import { Engagement } from "@/components/social/Engagement";
import { profile } from "@/data/profile";
import { formatDate } from "@/lib/format";
import { loadJournal } from "@/lib/journal/items";
import { getPostBySlug, getPublishedPosts, readingMinutes } from "@/lib/blog/posts";
import { getSiteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      tags: post.tags,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const url = `${getSiteUrl()}/blog/${post.slug}`;
  const minutes = readingMinutes(post.content);
  const published = post.publishedAt || post.updatedAt;
  const journal = await loadJournal();
  const index = journal.findIndex((item) => item.href === `/blog/${post.slug}`);
  const related = [
    ...journal.filter((item) => item.href !== `/blog/${post.slug}` && item.category === post.category),
    ...journal.filter((item) => item.href !== `/blog/${post.slug}` && item.category !== post.category),
  ].slice(0, 5);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: profile.name },
    mainEntityOfPage: url,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleFrame
        category={post.category}
        title={post.title}
        author={profile.name}
        authorHref="/developpeur"
        date={published}
        dateLabel={formatDate(published)}
        minutes={minutes}
        shareUrl={url}
        cover={post.coverImage}
        excerpt={post.excerpt}
        previous={index >= 0 && journal[index + 1] ? { href: journal[index + 1].href, title: journal[index + 1].title } : null}
        next={index > 0 ? { href: journal[index - 1].href, title: journal[index - 1].title } : null}
        related={related}
      >
        {post.demo ? (
          <p className="mb-6 border border-accent px-4 py-3 text-sm leading-6 text-muted">
            Article de démonstration. Ce texte n&apos;est pas un retour d&apos;expérience réel : il sert à montrer le
            blog et sera remplacé.
          </p>
        ) : null}
        <ArticleContent content={post.content} />
        <div className="mt-8">
          <Engagement type="article" id={post.slug} path={`/blog/${post.slug}`} />
        </div>
      </ArticleFrame>
    </>
  );
}
