import { BlogCard } from "@/components/blog/BlogCards";
import type { BlogPost } from "@/lib/blog/types";

export function BlogGrid({
  posts,
  emptyLabel = "Aucun article ne correspond à cette recherche.",
}: {
  posts: BlogPost[];
  emptyLabel?: string;
}) {
  if (posts.length === 0) {
    return <p className="border border-line px-4 py-10 text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <li key={post.slug}>
          <BlogCard post={post} />
        </li>
      ))}
    </ul>
  );
}
