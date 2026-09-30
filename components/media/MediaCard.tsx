import Link from "next/link";
import { mediaTypeLabels } from "@/lib/media/constants";
import { coverOf, mediaCounts } from "@/lib/media/format";
import { formatDate } from "@/lib/format";
import type { MediaPost } from "@/lib/media/types";

export function MediaCard({ post }: { post: MediaPost }) {
  const cover = coverOf(post.items);
  const { photos, videos } = mediaCounts(post.items);
  const when = post.publishedAt || post.createdAt;

  return (
    <article className="flex h-full flex-col border border-line bg-white">
      <Link href={`/media/${post.slug}`} className="block bg-[#e7eef8]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-sm font-semibold text-muted">{mediaTypeLabels[post.type]}</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col px-4 py-4">
        <p className="kicker">{post.category}</p>
        <h2 className="mt-2 text-xl font-bold text-ink">
          <Link href={`/media/${post.slug}`}>{post.title}</Link>
        </h2>
        {post.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{post.description}</p> : null}
        <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">
          {when ? formatDate(when) : ""}
          {photos ? ` · ${photos} photo${photos > 1 ? "s" : ""}` : ""}
          {videos ? ` · ${videos} vidéo${videos > 1 ? "s" : ""}` : ""}
        </p>
      </div>
    </article>
  );
}
