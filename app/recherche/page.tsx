import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recherche", robots: { index: false, follow: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim().slice(0, 60) ?? "";
  const supabase = query && (await createClient());
  const safe = query.replace(/[%_,]/g, "");
  const [people, posts] = supabase
    ? await Promise.all([
        supabase.from("profiles").select("username, display_name").ilike("username", `%${safe}%`).limit(8),
        supabase.from("posts").select("id, body, profiles!posts_user_id_fkey(username)").ilike("body", `%${safe}%`).limit(8),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold">Recherche</h1>
      <form className="mt-4 flex gap-2" action="/recherche">
        <input name="q" defaultValue={query} maxLength={60} className="field" placeholder="Un nom ou un mot" aria-label="Recherche" />
        <button type="submit" className="btn btn-primary h-12 min-h-0 px-4">
          Chercher
        </button>
      </form>
      {query ? (
        <div className="mt-6 grid gap-6">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Personnes</h2>
            <ul className="mt-2 grid gap-2">
              {(people.data ?? []).map((person) => (
                <li key={person.username}>
                  <Link href={`/profil/${person.username}`} className="font-semibold">
                    {person.display_name} <span className="text-muted">@{person.username}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Publications</h2>
            <ul className="mt-2 grid gap-2">
              {(posts.data ?? []).map((post) => (
                <li key={post.id}>
                  <Link href={`/p/${post.id}`} className="line-clamp-2 text-sm">
                    {post.body || "Publication"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
