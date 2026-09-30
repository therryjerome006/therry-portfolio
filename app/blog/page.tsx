import type { Metadata } from "next";
import Link from "next/link";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogSearch } from "@/components/blog/BlogSearch";
import { blogPageHref, BlogFilters } from "@/components/blog/BlogFilters";
import { FeaturedArticle } from "@/components/blog/BlogCards";
import { Container } from "@/components/layout/Section";
import { filterPosts, getFeaturedPost, getPublishedPosts, paginatePosts } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Articles de Therry Adler Jérôme sur le développement web, Next.js, React, les bases de données et les projets en cours.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Therry Adler Jérôme",
    description:
      "Notes de développement, apprentissages et retours sur des projets web.",
    url: "/blog",
  },
};

type Props = {
  searchParams: Promise<{ q?: string; category?: string; tag?: string; page?: string }>;
};

export default async function BlogPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = {
    q: params.q,
    category: params.category,
    tag: params.tag,
  };
  const filtering = Boolean(query.q || query.category || query.tag);
  const published = await getPublishedPosts();
  const featured = filtering ? null : await getFeaturedPost(published);
  const source = featured ? published.filter((post) => post.slug !== featured.slug) : published;
  const filtered = filterPosts(source, query);
  const page = Number(params.page ?? "1");
  const result = paginatePosts(filtered, Number.isFinite(page) ? page : 1);

  return (
    <Container className="py-16">
      <BlogHeader
        title="Notes de développement."
        text="Un espace pour écrire sur ce que j'apprends, ce que je construis et les problèmes que je rencontre."
      />
      <div className="mt-8 grid gap-4">
        <BlogSearch initial={query.q ?? ""} />
        <BlogFilters query={query} />
        {query.tag ? (
          <p className="text-sm text-muted">
            Tag : {query.tag}.{" "}
            <Link href={blogPageHref(1, { ...query, tag: undefined })} className="underline">
              Retirer
            </Link>
          </p>
        ) : null}
      </div>
      {featured ? (
        <div className="mt-10">
          <FeaturedArticle post={featured} />
        </div>
      ) : null}
      <div className="mt-10">
        <BlogGrid
          posts={result.items}
          emptyLabel={
            published.length === 0 && !filtering
              ? "Aucun article publié pour le moment."
              : undefined
          }
        />
      </div>
      {result.totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Pagination">
          {result.currentPage > 1 ? (
            <Link href={blogPageHref(result.currentPage - 1, query)} className="btn btn-line">
              Précédent
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted">
            Page {result.currentPage} / {result.totalPages}
          </p>
          {result.currentPage < result.totalPages ? (
            <Link href={blogPageHref(result.currentPage + 1, query)} className="btn btn-line">
              Suivant
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </Container>
  );
}
