import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { ArticleHeader } from "@/components/blog/ArticleHeader";
import { ArticleShare } from "@/components/blog/ArticleShare";
import { RelatedArticles } from "@/components/blog/BlogCards";
import { Container } from "@/components/layout/Section";
import { Engagement } from "@/components/social/Engagement";
import { profile } from "@/data/profile";
import {
  getAdjacentPosts,
  getPostBySlug,
  getPublishedPosts,
  getRelatedPosts,
  readingMinutes,
} from "@/lib/blog/posts";
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

  const [related, adjacent] = await Promise.all([getRelatedPosts(post), getAdjacentPosts(slug)]);
  const url = `${getSiteUrl()}/blog/${post.slug}`;
  const minutes = readingMinutes(post.content);
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
    <Container className="py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleHeader post={post} minutes={minutes} />
      {post.demo ? (
        <p className="mx-auto mt-6 max-w-3xl border border-accent px-4 py-3 text-sm leading-6 text-muted">
          Article de démonstration. Ce texte n&apos;est pas un retour d&apos;expérience réel : il sert à
          montrer le blog et sera remplacé.
        </p>
      ) : null}
      <div className="mx-auto mt-8 max-w-3xl">
        <ArticleShare title={post.title} url={url} />
        <div className="mt-8">
          <ArticleContent content={post.content} />
        </div>
        <div className="mt-10">
          <ArticleShare title={post.title} url={url} />
        </div>
        <Engagement type="article" id={post.slug} path={`/blog/${post.slug}`} />
      </div>
      <nav className="mx-auto mt-12 grid max-w-3xl gap-4 border-t border-line pt-8 sm:grid-cols-2" aria-label="Articles voisins">
        {adjacent.previous ? (
          <Link href={`/blog/${adjacent.previous.slug}`} className="border border-line p-4">
            <span className="text-xs text-muted">Précédent</span>
            <span className="mt-2 block text-ink">{adjacent.previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {adjacent.next ? (
          <Link href={`/blog/${adjacent.next.slug}`} className="border border-line p-4 sm:text-right">
            <span className="text-xs text-muted">Suivant</span>
            <span className="mt-2 block text-ink">{adjacent.next.title}</span>
          </Link>
        ) : null}
      </nav>
      <RelatedArticles posts={related} />
    </Container>
  );
}
