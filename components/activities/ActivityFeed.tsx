import type { ActivityPost } from "@/lib/activities/db";
import { PhotoStrip } from "@/components/activities/PhotoStrip";
import { Engagement } from "@/components/social/Engagement";
import { formatDate } from "@/lib/format";

export function ActivityFeed({ posts }: { posts: ActivityPost[] }) {
  return (
    <ol className="mx-auto mt-10 grid max-w-lg gap-8">
      {posts.map((post) => (
        <li key={post.id}>
          <article className="border-[3px] border-[#12263f] bg-white">
            <header className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-sm font-bold text-ink">{post.category}</p>
              <time className="text-xs font-semibold text-muted" dateTime={post.publishedAt || post.createdAt}>
                {formatDate(post.publishedAt || post.createdAt)}
              </time>
            </header>
            {post.items.length > 0 ? <PhotoStrip items={post.items} /> : null}
            <p className="px-4 py-4 text-sm leading-6 whitespace-pre-wrap text-ink">{post.description}</p>
            <div className="px-4 pb-4">
              <Engagement type="post" id={post.id} path="/realisations" />
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
