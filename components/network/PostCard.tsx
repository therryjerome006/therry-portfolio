import Link from "next/link";
import { FeedActions } from "@/components/network/FeedActions";
import type { FeedPost } from "@/lib/network/feed";
import { formatRelative } from "@/lib/format";

export function PostCard({ post, detailed = false }: { post: FeedPost; detailed?: boolean }) {
  const path = `/p/${post.id}`;
  const authorHref = post.author.editorial ? `/redaction/${post.author.username}` : `/profil/${post.author.username}`;
  return (
    <article className="post-card">
      <div className="post-body">
        <header className="flex items-center gap-3">
          <Link href={authorHref} className="grid h-11 w-11 shrink-0 place-items-center bg-gradient-to-br from-[#1d6fe8] to-[#49c4ff] text-sm font-bold text-white">
            {post.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.author.avatarUrl} alt="" className="h-11 w-11 object-cover" />
            ) : (
              post.author.displayName.slice(0, 1).toUpperCase()
            )}
          </Link>
          <div className="min-w-0">
            <Link href={authorHref} className="inline-flex max-w-full items-center gap-2 truncate text-sm font-bold text-ink">
              <span className="truncate">{post.author.displayName}</span>
              {post.author.editorial ? <span className="shrink-0 border border-accent px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-accent">Éditorial</span> : null}
            </Link>
            <p className="text-xs text-muted">
              @{post.author.username} · <time dateTime={post.createdAt}>{formatRelative(post.createdAt)}</time>
              {post.communityName && post.communitySlug ? (
                <>
                  {" "}
                  · <Link href={`/communautes/${post.communitySlug}`} className="font-semibold">{post.communityName}</Link>
                </>
              ) : null}
              {post.schoolName ? <> · {post.schoolName}</> : null}
            </p>
          </div>
        </header>
        {post.body ? <p className="mt-3 whitespace-pre-wrap text-[15px] leading-6 text-ink">{post.body}</p> : null}
        {post.discussion ? <p className="mt-3 text-sm font-semibold text-ink">{post.discussion}</p> : null}
      </div>
      {post.media?.mediaType === "image" ? (
        <Link href={path} className="post-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.media.url} alt="" loading="lazy" />
        </Link>
      ) : null}
      {post.media?.mediaType === "video" ? (
        <video className="post-media bg-black" controls preload="metadata" playsInline src={post.media.url} />
      ) : null}
      <FeedActions
        postId={post.id}
        kind={post.kind}
        likeCount={post.likeCount}
        commentCount={post.commentCount}
        liked={post.liked}
        saved={post.saved}
        path={path}
        showLike={!detailed}
        canSave={post.canSave !== false}
      />
    </article>
  );
}
