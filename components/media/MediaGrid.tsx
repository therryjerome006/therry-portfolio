import { MediaCard } from "@/components/media/MediaCard";
import type { MediaPost } from "@/lib/media/types";

export function MediaGrid({ posts }: { posts: MediaPost[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li key={post.id}>
          <MediaCard post={post} />
        </li>
      ))}
    </ul>
  );
}
