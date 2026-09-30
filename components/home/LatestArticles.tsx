import Link from "next/link";
import { BlogCard } from "@/components/blog/BlogCards";
import { Section } from "@/components/layout/Section";
import type { BlogPost } from "@/lib/blog/types";

export function LatestArticles({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Journal</p>
          <h2 className="display mt-4 text-4xl text-ink sm:text-5xl">Latest Articles</h2>
        </div>
        <Link href="/blog" className="text-sm text-ink underline decoration-line underline-offset-4">
          Voir tous les articles →
        </Link>
      </div>
      <ul className="mt-10 grid gap-5 md:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <BlogCard post={post} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
