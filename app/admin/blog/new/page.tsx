import Link from "next/link";
import { PostEditor } from "@/components/admin/PostEditor";
import { requireAdmin } from "@/lib/auth/session";

export default async function NewPostPage() {
  await requireAdmin();

  return (
    <div>
      <p className="kicker">Rédaction</p>
      <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">Nouvel article</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Écrivez le texte comme dans un document. Ajoutez un bloc de code quand vous voulez les couleurs, les langages et les suggestions. Enregistrez un brouillon, ou publiez pour le montrer sur le blog.
      </p>
      <p className="mt-4">
        <Link href="/admin/blog" className="text-sm font-semibold text-accent">
          Retour aux articles
        </Link>
      </p>
      <div className="mt-8">
        <PostEditor />
      </div>
    </div>
  );
}
