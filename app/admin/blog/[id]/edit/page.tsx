import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { requireAdmin } from "@/lib/auth/session";
import { getPostBySlug } from "@/lib/blog/posts";

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const post = await getPostBySlug(id, true);
  if (!post) notFound();

  return (
    <div>
      <p className="kicker">Rédaction</p>
      <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Modifier l&apos;article</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{post.title}</p>
      <p className="mt-4 flex flex-wrap gap-4">
        <Link href="/admin/blog" className="text-sm font-semibold text-accent">
          Retour aux articles
        </Link>
        {post.status === "published" ? (
          <Link href={`/blog/${post.slug}`} className="text-sm font-semibold text-accent">
            Voir sur le site
          </Link>
        ) : null}
      </p>
      <div className="mt-8">
        <PostEditor post={post} saved={saved === "1"} />
      </div>
    </div>
  );
}
