import Link from "next/link";
import { Eye, PenLine } from "lucide-react";
import { DeletePost } from "@/components/admin/DeletePost";
import { BlogSearch } from "@/components/blog/BlogSearch";
import { blogCategories } from "@/data/blog";
import { requireAdmin } from "@/lib/auth/session";
import { filterPosts, getAllPosts, readingMinutes } from "@/lib/blog/posts";
import { formatDate } from "@/lib/format";

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const all = await getAllPosts();
  const posts = filterPosts(all, {
    q: params.q,
    category: params.category,
  }).filter((post) => (params.status ? post.status === params.status : true));
  const published = all.filter((post) => post.status === "published").length;
  const drafts = all.filter((post) => post.status === "draft").length;
  const featured = all.filter((post) => post.featured).length;
  const filtered = Boolean(params.q || params.category || params.status);

  function href(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const query = {
      q: params.q,
      category: params.category,
      status: params.status,
      ...patch,
    };
    for (const [key, value] of Object.entries(query)) {
      if (value) next.set(key, value);
    }
    const value = next.toString();
    return value ? `/admin/blog?${value}` : "/admin/blog";
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5 border-t-[8px] border-[#1d6fe8] bg-white px-5 py-7 sm:px-7">
        <div>
          <p className="kicker">Blog</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Articles</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Les brouillons restent privés. Seuls les articles publiés apparaissent sur le site.
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn btn-primary">
          <PenLine size={16} aria-hidden="true" />
          Nouvel article
        </Link>
      </div>

      {params.error === "delete" ? (
        <p className="mt-4 border border-danger/30 bg-[#fff1f4] px-4 py-3 text-sm text-danger" role="alert">
          La suppression a échoué.
        </p>
      ) : null}

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tous" value={all.length} tone="#12263f" />
        <Stat label="Publiés" value={published} tone="#1d6fe8" />
        <Stat label="Brouillons" value={drafts} tone="#b45309" />
        <Stat label="À la une" value={featured} tone="#166534" />
      </ul>

      <div className="mt-6 border border-line bg-white p-4 sm:p-5">
        <BlogSearch initial={params.q ?? ""} basePath="/admin/blog" />
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterLink href={href({ status: undefined })} active={!params.status} label="Tous les statuts" />
          <FilterLink href={href({ status: "published" })} active={params.status === "published"} label="Publiés" />
          <FilterLink href={href({ status: "draft" })} active={params.status === "draft"} label="Brouillons" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <FilterLink href={href({ category: undefined })} active={!params.category} label="Toutes les catégories" />
          {blogCategories.map((category) => (
            <FilterLink
              key={category}
              href={href({ category })}
              active={params.category === category}
              label={category}
            />
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="mt-6 border-[3px] border-[#12263f] bg-white px-6 py-12 text-center">
          <p className="text-lg font-bold text-ink">{filtered ? "Aucun article ne correspond." : "Aucun article pour le moment."}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            {filtered
              ? "Changez la recherche ou les filtres pour revoir la liste."
              : "Le premier article que vous écrivez ici pourra être publié sur le blog."}
          </p>
          {filtered ? null : (
            <Link href="/admin/blog/new" className="btn btn-primary mt-6">
              Écrire un article
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {posts.map((post) => (
            <li key={post.slug} className="grid gap-4 border-[2px] border-[#12263f] bg-white p-4 sm:grid-cols-[7.5rem_1fr] sm:p-5">
              <Cover src={post.coverImage} />
              <div className="flex min-w-0 flex-col justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={post.status} />
                    <span className="chip">{post.category}</span>
                    {post.featured ? <span className="chip border-[#1d6fe8] text-accent">À la une</span> : null}
                  </div>
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">{post.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{post.excerpt}</p>
                  <p className="mt-3 font-mono text-xs text-muted">
                    {post.publishedAt ? formatDate(post.publishedAt) : "Sans date"}
                    {" · "}
                    {readingMinutes(post.content)} min
                    {" · "}
                    /blog/{post.slug}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/blog/${post.slug}/edit`} className="btn btn-line h-10 min-h-0 px-3 text-sm">
                    Modifier
                  </Link>
                  {post.status === "published" ? (
                    <Link href={`/blog/${post.slug}`} className="btn btn-line h-10 min-h-0 px-3 text-sm">
                      <Eye size={15} aria-hidden="true" />
                      Voir
                    </Link>
                  ) : null}
                  <DeletePost slug={post.slug} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <li className="border border-line bg-white px-4 py-4" style={{ borderTop: `4px solid ${tone}` }}>
      <p className="font-mono text-xs font-bold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</p>
    </li>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  const published = status === "published";
  return (
    <span
      className="inline-flex px-2 py-1 font-mono text-[0.68rem] font-bold tracking-[0.12em] uppercase"
      style={
        published
          ? { background: "#e8f6ec", color: "#166534" }
          : { background: "#fff4e5", color: "#9a3412" }
      }
    >
      {published ? "Publié" : "Brouillon"}
    </span>
  );
}

function Cover({ src }: { src: string }) {
  if (!src) {
    return (
      <div className="grid h-28 place-items-center border border-line bg-[#e4edf8] font-mono text-xs font-bold text-accent sm:h-full">
        Sans image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-28 w-full border border-line object-cover sm:h-full" />
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`shrink-0 border px-3 py-2 text-sm font-semibold ${
        active ? "border-accent bg-accent text-white" : "border-line bg-white text-muted hover:text-ink"
      }`}
      aria-current={active ? "true" : undefined}
    >
      {label}
    </Link>
  );
}
