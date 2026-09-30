import Link from "next/link";
import { mediaTypeLabels } from "@/lib/media/constants";
import { coverOf } from "@/lib/media/format";
import type { MediaPost } from "@/lib/media/types";

export function FeaturedMedia({ post }: { post: MediaPost }) {
  const cover = coverOf(post.items);
  return (
    <article className="grid border border-line bg-white md:grid-cols-[1.2fr_0.8fr]">
      <Link href={`/media/${post.slug}`} className="block bg-[#e7eef8]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="aspect-[16/10] h-full w-full object-cover" />
        ) : (
          <div className="grid aspect-[16/10] place-items-center font-semibold text-muted">{mediaTypeLabels[post.type]}</div>
        )}
      </Link>
      <div className="flex flex-col justify-end p-6">
        <p className="kicker">{post.category}</p>
        <h3 className="mt-3 text-3xl font-bold text-ink">
          <Link href={`/media/${post.slug}`}>{post.title}</Link>
        </h3>
        {post.description ? <p className="mt-3 leading-7 text-muted">{post.description}</p> : null}
      </div>
    </article>
  );
}
