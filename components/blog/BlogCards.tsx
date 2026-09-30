import Image from "next/image";
import Link from "next/link";
import { formatDate, readingLabel } from "@/lib/format";
import { readingMinutes } from "@/lib/blog/posts";
import type { BlogPost } from "@/lib/blog/types";

function Cover({ post, className }: { post: BlogPost; className: string }) {
  if (!post.coverImage) {
    return <div className={`${className} bg-bg`} aria-hidden="true" />;
  }
  return (
    <Image
      src={post.coverImage}
      alt=""
      width={1200}
      height={750}
      className={className}
      unoptimized={post.coverImage.endsWith(".svg")}
    />
  );
}

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <article className="card-hover flex h-full flex-col border border-line bg-surface">
      <Link href={`/blog/${post.slug}`} className="block overflow-hidden border-b border-line">
        <Cover post={post} className="h-48 w-full object-cover" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="chip">
            {post.category}
          </Link>
          {post.publishedAt ? <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> : null}
          <span>{readingLabel(readingMinutes(post.content))}</span>
        </div>
        <h3 className="mt-4 text-xl text-ink">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted">{post.excerpt}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link href={`/blog?tag=${encodeURIComponent(tag)}`} className="chip">
                {tag}
              </Link>
            </li>
          ))}
        </ul>
        <Link href={`/blog/${post.slug}`} className="btn btn-line mt-5 self-start">
          Lire l&apos;article
        </Link>
      </div>
    </article>
  );
}

export function FeaturedArticle({ post }: { post: BlogPost }) {
  return (
    <article className="grid border border-line bg-surface lg:grid-cols-[1.15fr_0.85fr]">
      <Link href={`/blog/${post.slug}`} className="block min-h-64 overflow-hidden border-b border-line lg:border-r lg:border-b-0">
        <Cover post={post} className="h-full min-h-64 w-full object-cover" />
      </Link>
      <div className="flex flex-col p-6 sm:p-8">
        <p className="kicker">Featured Article</p>
        <h2 className="display mt-4 text-3xl text-ink sm:text-4xl">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="mt-4 leading-7 text-muted">{post.excerpt}</p>
        <p className="mt-4 text-sm text-muted">
          {post.category}
          {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ""}
        </p>
        <Link href={`/blog/${post.slug}`} className="btn btn-primary mt-6 self-start">
          Lire
        </Link>
      </div>
    </article>
  );
}

export function RelatedArticles({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="mt-16 border-t border-line pt-10">
      <h2 className="display text-3xl text-ink">Articles similaires</h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}
