import Image from "next/image";
import Link from "next/link";
import { formatDate, readingLabel } from "@/lib/format";
import type { BlogPost } from "@/lib/blog/types";

export function ArticleHeader({ post, minutes }: { post: BlogPost; minutes: number }) {
  return (
    <header className="mx-auto max-w-3xl">
      <p className="text-sm text-muted">
        <Link href="/blog" className="hover:text-ink">
          Blog
        </Link>
        {" / "}
        <Link href={`/blog?category=${encodeURIComponent(post.category)}`} className="hover:text-ink">
          {post.category}
        </Link>
      </p>
      <h1 className="display mt-4 text-4xl text-ink sm:text-5xl">{post.title}</h1>
      <p className="mt-4 text-sm text-muted">
        {post.publishedAt ? <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> : null}
        {" · "}
        {readingLabel(minutes)}
      </p>
      {post.coverImage ? (
        <Image
          src={post.coverImage}
          alt=""
          width={1200}
          height={750}
          priority
          className="mt-8 h-auto w-full border border-line object-cover"
          unoptimized={post.coverImage.endsWith(".svg")}
        />
      ) : null}
      <ul className="mt-5 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <li key={tag}>
            <Link href={`/blog?tag=${encodeURIComponent(tag)}`} className="chip">
              {tag}
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}
