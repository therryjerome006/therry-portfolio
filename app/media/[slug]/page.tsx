import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleShare } from "@/components/blog/ArticleShare";
import { MediaGallery } from "@/components/media/MediaGallery";
import { RelatedMedia } from "@/components/media/RelatedMedia";
import { Container } from "@/components/layout/Section";
import { Engagement } from "@/components/social/Engagement";
import { mediaTypeLabels } from "@/lib/media/constants";
import { getMediaBySlug, neighbors, relatedMedia } from "@/lib/media/db";
import { coverOf } from "@/lib/media/format";
import { formatDate } from "@/lib/format";
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getMediaBySlug(slug, true);
  if (!post) return {};
  const image = coverOf(post.items);
  const description = post.description || post.title;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/media/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `/media/${post.slug}`,
      type: "article",
      images: image ? [image] : undefined,
    },
  };
}

export default async function MediaPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getMediaBySlug(slug, true);
  if (!post) notFound();
  const [around, related] = await Promise.all([neighbors(post), relatedMedia(post)]);
  const when = post.publishedAt || post.createdAt;
  const shareUrl = `${getSiteUrl()}/media/${post.slug}`;

  return (
    <Container className="py-16">
      <p className="text-sm text-muted">
        <Link href="/media" className="text-ink">
          Media
        </Link>
        {" / "}
        {post.category}
      </p>
      <p className="kicker mt-6">{mediaTypeLabels[post.type]}</p>
      <h1 className="display mt-3 text-4xl text-ink sm:text-6xl">{post.title}</h1>
      <p className="mt-4 text-sm font-semibold text-muted">{when ? formatDate(when) : ""}</p>
      {post.description ? <p className="mt-6 max-w-3xl text-lg leading-8 text-muted">{post.description}</p> : null}
      <div className="mt-8">
        <MediaGallery items={post.items} />
      </div>
      {post.articlePath ? (
        <p className="mt-8">
          <Link href={post.articlePath} className="text-sm font-semibold text-ink underline decoration-line underline-offset-4">
            Lire l&apos;article lié
          </Link>
        </p>
      ) : null}
      {post.tags.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link href={`/media?q=${encodeURIComponent(tag)}`} className="border border-line bg-white px-2 py-1 text-xs font-semibold">
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-8">
        <ArticleShare title={post.title} url={shareUrl} />
      </div>
      <Engagement type="media" id={post.id} path={`/media/${post.slug}`} />
      <nav className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-6" aria-label="Publications voisines">
        {around.previous ? (
          <Link href={`/media/${around.previous.slug}`} className="text-sm font-semibold">
            Previous · {around.previous.title}
          </Link>
        ) : (
          <span />
        )}
        {around.next ? (
          <Link href={`/media/${around.next.slug}`} className="text-sm font-semibold">
            Next · {around.next.title}
          </Link>
        ) : null}
      </nav>
      <RelatedMedia posts={related} />
    </Container>
  );
}
