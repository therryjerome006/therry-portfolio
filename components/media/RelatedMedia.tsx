import { MediaCard } from "@/components/media/MediaCard";
import type { MediaPost } from "@/lib/media/types";

export function RelatedMedia({ posts }: { posts: MediaPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-ink">Related Media</h2>
      <ul className="mt-6 grid gap-5 md:grid-cols-3">
        {posts.map((post) => (
          <li key={post.id}>
            <MediaCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}
