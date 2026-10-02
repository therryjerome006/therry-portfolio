import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { removeCommentAsAdmin } from "@/lib/actions/moderation";
import { communityStats } from "@/lib/social/admin";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const targets: Record<string, (id: string) => string> = {
  article: (id) => `/blog/${id}`,
  project: (id) => `/projects/${id}`,
  media: (id) => `/media`,
  post: (id) => `/realisations`,
};

export default async function CommunityPage() {
  await requireAdmin();
  const stats = await communityStats();

  return (
    <div>
      <div className="border-t-[8px] border-[#1d6fe8] bg-white px-5 py-7 sm:px-7">
        <p className="kicker">Communauté</p>
        <h1 className="display mt-3 text-4xl text-ink">Interactions</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Les visiteurs aiment et commentent. La publication des articles, réalisations et médias reste dans l&apos;administration.
        </p>
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        <li className="border border-line bg-white px-4 py-4">
          <p className="text-sm text-muted">Profils</p>
          <p className="text-3xl font-bold">{stats.profiles}</p>
        </li>
        <li className="border border-line bg-white px-4 py-4">
          <p className="text-sm text-muted">Commentaires</p>
          <p className="text-3xl font-bold">{stats.comments}</p>
        </li>
        <li className="border border-line bg-white px-4 py-4">
          <p className="text-sm text-muted">J&apos;aime</p>
          <p className="text-3xl font-bold">{stats.likes}</p>
        </li>
      </ul>
      {stats.commentsList.length === 0 ? (
        <div className="mt-6 border-[3px] border-[#12263f] bg-white px-6 py-12 text-center">
          <p className="text-lg font-bold">Aucun commentaire pour le moment.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {stats.commentsList.map((comment) => (
            <li key={comment.id} className="border border-line bg-white px-4 py-4">
              <p className="text-xs font-bold tracking-wide text-accent uppercase">
                {comment.author} · {comment.contentType} · {formatDate(comment.createdAt)}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink">{comment.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={targets[comment.contentType]?.(comment.contentId) ?? "/"} className="btn btn-line h-10 min-h-0 px-3">
                  Voir
                </Link>
                <form action={removeCommentAsAdmin}>
                  <input type="hidden" name="id" value={comment.id} />
                  <button type="submit" className="btn h-10 min-h-0 border border-danger/40 bg-white px-3 text-sm text-danger">
                    Supprimer
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
