import Link from "next/link";
import { PenLine } from "lucide-react";
import { DeleteActivity } from "@/components/admin/DeleteActivity";
import { requireAdmin } from "@/lib/auth/session";
import { listActivityPosts, type ActivityItem } from "@/lib/activities/db";
import { changeActivityStatus } from "@/lib/actions/activities";
import { databaseConfigured } from "@/lib/media/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function fileLabel(items: ActivityItem[]) {
  const photos = items.filter((item) => item.kind === "image").length;
  const videos = items.filter((item) => item.kind === "video").length;
  const parts = [
    photos ? `${photos} photo${photos > 1 ? "s" : ""}` : "",
    videos ? `${videos} vidéo${videos > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  return parts.join(", ") || "Sans fichier";
}

export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const ready = databaseConfigured();
  const posts = ready ? await listActivityPosts({ publishedOnly: false }) : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5 border-t-[8px] border-[#1d6fe8] bg-white px-5 py-7 sm:px-7">
        <div>
          <p className="kicker">Réalisations</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Publications</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Plusieurs photos par publication, avec une seule description pour le post. Les brouillons restent hors du site.
          </p>
        </div>
        <Link href="/admin/realisations/new" className="btn btn-primary">
          <PenLine size={16} aria-hidden="true" />
          Nouvelle publication
        </Link>
      </div>

      {!ready ? (
        <p className="mt-4 border border-danger/30 bg-[#fff1f4] px-4 py-3 text-sm text-danger" role="alert">
          Ajoutez DATABASE_URL et NEXT_PUBLIC_SUPABASE_URL pour enregistrer les publications.
        </p>
      ) : null}
      {params.error === "delete" ? (
        <p className="mt-4 border border-danger/30 bg-[#fff1f4] px-4 py-3 text-sm text-danger" role="alert">
          La suppression a échoué.
        </p>
      ) : null}

      {posts.length === 0 ? (
        <div className="mt-6 border-[3px] border-[#12263f] bg-white px-6 py-12 text-center">
          <p className="text-lg font-bold">Aucune publication pour le moment.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-4 border border-line bg-white px-4 py-4">
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-wide text-accent uppercase">
                  {post.category} · {fileLabel(post.items)} · {post.status === "published" ? "Publié" : "Brouillon"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink">{post.description}</p>
                <p className="mt-1 text-sm text-muted">{formatDate(post.publishedAt || post.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/realisations/${post.id}/edit`} className="btn btn-line h-10 min-h-0 px-3">
                  Modifier
                </Link>
                {post.status === "published" ? (
                  <Link href={`/realisations?categorie=${encodeURIComponent(post.category)}`} className="btn btn-line h-10 min-h-0 px-3">
                    Voir
                  </Link>
                ) : null}
                <form action={changeActivityStatus}>
                  <input type="hidden" name="id" value={post.id} />
                  <input type="hidden" name="status" value={post.status === "published" ? "draft" : "published"} />
                  <button type="submit" className="btn btn-line h-10 min-h-0 px-3">
                    {post.status === "published" ? "Dépublier" : "Publier"}
                  </button>
                </form>
                <DeleteActivity id={post.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
