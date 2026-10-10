import type { Metadata } from "next";
import Link from "next/link";
import { CommunityCard } from "@/components/network/CommunityCard";
import { PostCard } from "@/components/network/PostCard";
import { loadEditorialDirectory } from "@/lib/editorial/public";
import { categoryLabel } from "@/lib/editorial/constants";
import { loadCommunities, loadFeed } from "@/lib/network/feed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Découvrir", description: "Personnes, communautés et publications à découvrir sur TY Space." };

export default async function DiscoverPage() {
  const supabase = await createClient();
  const [communities, trending, editorial, people] = await Promise.all([
    loadCommunities(),
    loadFeed("tendances", 0),
    loadEditorialDirectory(),
    supabase
      ? supabase.from("profiles").select("username, display_name, avatar_url, bio").order("created_at", { ascending: false }).limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6">
      <section>
        <h1 className="text-2xl font-bold">Découvrir</h1>
        <p className="mt-3 text-sm"><Link href="/talents" className="font-semibold text-accent">TY Space Talents</Link> réunit les portfolios, les services et les missions publiés.</p>
        <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Profils à suivre</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {editorial.length === 0 ? <li className="text-sm text-muted">Aucun profil éditorial actif.</li> : null}
          {editorial.map((profile) => (
            <li key={profile.id}>
              <Link href={`/redaction/${profile.slug}`} className="flex h-full gap-3 border border-line bg-white p-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center bg-[#e4edf8] text-sm font-bold">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt="" className="h-12 w-12 object-cover" />
                  ) : (
                    profile.name.slice(0, 1)
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{profile.name}</span>
                  <span className="block text-xs font-bold uppercase tracking-wide text-accent">Éditorial · {categoryLabel(profile.category)}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted">{profile.description}</span>
                  <span className="mt-1 block text-xs text-muted">{profile.followers} {profile.followers > 1 ? "abonnés" : "abonné"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Communautés</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => (
            <li key={community.id}>
              <CommunityCard community={community} />
            </li>
          ))}
        </ul>
      </section>
      <div className="grid gap-6">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Nouveaux membres</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {(people.data ?? []).map((person) => (
              <li key={person.username}>
                <Link href={`/profil/${person.username}`} className="flex items-center gap-3 border border-line bg-white p-3">
                  <span className="grid h-10 w-10 place-items-center bg-[#e4edf8] text-sm font-bold">
                    {person.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={person.avatar_url} alt="" className="h-10 w-10 object-cover" />
                    ) : (
                      String(person.display_name).slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{person.display_name}</span>
                    <span className="text-xs text-muted">@{person.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="grid gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Tendances</h2>
          {trending.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {trending.posts.length === 0 ? <p className="text-sm text-muted">Les publications les plus aimées apparaîtront ici.</p> : null}
        </section>
      </div>
    </div>
  );
}
