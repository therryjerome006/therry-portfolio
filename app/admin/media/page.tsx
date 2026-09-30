import Link from "next/link";
import { PenLine } from "lucide-react";
import { DeleteMedia } from "@/components/admin/DeleteMedia";
import { requireAdmin } from "@/lib/auth/session";
import { MediaSearch } from "@/components/media/MediaSearch";
import { mediaCategories, mediaTypeLabels, mediaTypes } from "@/lib/media/constants";
import { changeMediaStatus } from "@/lib/actions/media";
import { databaseConfigured, listMedia } from "@/lib/media/db";
import { formatDate } from "@/lib/format";

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; category?: string; status?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const ready = databaseConfigured();
  const all = ready ? await listMedia({ publishedOnly: false }) : [];
  const posts = ready
    ? await listMedia({
        publishedOnly: false,
        query: params.q,
        type: params.type,
        category: params.category,
        status: params.status,
      })
    : [];

  function href(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const query = { q: params.q, type: params.type, category: params.category, status: params.status, ...patch };
    for (const [key, value] of Object.entries(query)) {
      if (value) next.set(key, value);
    }
    const value = next.toString();
    return value ? `/admin/media?${value}` : "/admin/media";
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5 border-t-[8px] border-[#1d6fe8] bg-white px-5 py-7 sm:px-7">
        <div>
          <p className="kicker">Media</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Journal</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Les brouillons restent privés. Seules les publications publiées apparaissent sur le site.
          </p>
        </div>
        <Link href="/admin/media/new" className="btn btn-primary">
          <PenLine size={16} aria-hidden="true" />
          Nouvelle publication
        </Link>
      </div>

      {!ready ? (
        <p className="mt-4 border border-danger/30 bg-[#fff1f4] px-4 py-3 text-sm text-danger" role="alert">
          Ajoutez DATABASE_URL et NEXT_PUBLIC_SUPABASE_URL pour enregistrer le journal.
        </p>
      ) : null}
      {params.error === "delete" ? (
        <p className="mt-4 border border-danger/30 bg-[#fff1f4] px-4 py-3 text-sm text-danger" role="alert">
          La suppression a échoué.
        </p>
      ) : null}

      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        <li className="border border-line bg-white px-4 py-4">
          <p className="text-sm text-muted">Tous</p>
          <p className="text-3xl font-bold">{all.length}</p>
        </li>
        <li className="border border-line bg-white px-4 py-4">
          <p className="text-sm text-muted">Publiés</p>
          <p className="text-3xl font-bold">{all.filter((post) => post.status === "published").length}</p>
        </li>
        <li className="border border-line bg-white px-4 py-4">
          <p className="text-sm text-muted">Brouillons</p>
          <p className="text-3xl font-bold">{all.filter((post) => post.status === "draft").length}</p>
        </li>
      </ul>

      <div className="mt-6 border border-line bg-white p-4 sm:p-5">
        <MediaSearch initial={params.q ?? ""} basePath="/admin/media" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Filter href={href({ status: undefined })} active={!params.status} label="Tous les statuts" />
          <Filter href={href({ status: "published" })} active={params.status === "published"} label="Publiés" />
          <Filter href={href({ status: "draft" })} active={params.status === "draft"} label="Brouillons" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Filter href={href({ type: undefined })} active={!params.type} label="Tous les types" />
          {mediaTypes.map((type) => (
            <Filter key={type} href={href({ type })} active={params.type === type} label={mediaTypeLabels[type]} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Filter href={href({ category: undefined })} active={!params.category} label="Toutes les catégories" />
          {mediaCategories.map((category) => (
            <Filter key={category} href={href({ category })} active={params.category === category} label={category} />
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6 border-[3px] border-[#12263f] bg-white px-6 py-12 text-center">
          <p className="text-lg font-bold">Aucune publication pour le moment.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-4 border border-line bg-white px-4 py-4">
              <div>
                <p className="text-xs font-bold tracking-wide text-accent uppercase">
                  {mediaTypeLabels[post.type]} · {post.category} · {post.status === "published" ? "Publié" : "Brouillon"}
                </p>
                <h2 className="mt-1 text-xl font-bold">{post.title}</h2>
                <p className="mt-1 text-sm text-muted">{formatDate(post.publishedAt || post.createdAt)} · {post.items.length} média{post.items.length > 1 ? "s" : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/media/${post.id}/edit`} className="btn btn-line h-10 min-h-0 px-3">
                  Modifier
                </Link>
                {post.status === "published" ? (
                  <Link href={`/media/${post.slug}`} className="btn btn-line h-10 min-h-0 px-3">
                    Voir
                  </Link>
                ) : null}
                <form action={changeMediaStatus}>
                  <input type="hidden" name="id" value={post.id} />
                  <input type="hidden" name="status" value={post.status === "published" ? "draft" : "published"} />
                  <button type="submit" className="btn btn-line h-10 min-h-0 px-3">
                    {post.status === "published" ? "Dépublier" : "Publier"}
                  </button>
                </form>
                <DeleteMedia id={post.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Filter({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href} className={`border px-3 py-1.5 text-sm font-semibold ${active ? "border-ink bg-ink text-white" : "border-line text-ink"}`}>
      {label}
    </Link>
  );
}
