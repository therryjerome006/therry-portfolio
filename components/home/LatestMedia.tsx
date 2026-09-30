import Link from "next/link";
import { FeaturedMedia } from "@/components/media/FeaturedMedia";
import { MediaCard } from "@/components/media/MediaCard";
import { Section } from "@/components/layout/Section";
import type { MediaPost } from "@/lib/media/types";

export function LatestMedia({ posts }: { posts: MediaPost[] }) {
  if (posts.length === 0) return null;
  const [featured, ...rest] = posts;

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Media</p>
          <h2 className="display mt-4 text-4xl text-ink sm:text-5xl">Latest Media</h2>
        </div>
        <Link href="/media" className="text-sm text-ink underline decoration-line underline-offset-4">
          Voir tout le Media →
        </Link>
      </div>
      <div className="mt-10 grid gap-5">
        {featured ? <FeaturedMedia post={featured} /> : null}
        {rest.length > 0 ? (
          <ul className="grid gap-5 md:grid-cols-2">
            {rest.map((post) => (
              <li key={post.id}>
                <MediaCard post={post} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Section>
  );
}
