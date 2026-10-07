import type { Metadata } from "next";
import Link from "next/link";
import { loadCommunities } from "@/lib/network/feed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Communautés", description: "Les communautés de TY Space." };

export default async function CommunitiesPage() {
  const communities = await loadCommunities();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold">Communautés</h1>
      <p className="mt-1 text-sm text-muted">Rejoignez un espace et publiez avec les autres.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {communities.map((community) => (
          <li key={community.id}>
            <Link href={`/communautes/${community.slug}`} className="block h-full border border-line bg-white p-4">
              <span className="block font-bold">{community.name}</span>
              <span className="mt-1 block text-sm leading-6 text-muted">{community.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      {communities.length === 0 ? <p className="mt-4 text-sm text-muted">Les communautés apparaîtront ici.</p> : null}
    </div>
  );
}
