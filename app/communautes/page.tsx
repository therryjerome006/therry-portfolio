import type { Metadata } from "next";
import { CommunityCard } from "@/components/network/CommunityCard";
import { loadCommunities } from "@/lib/network/feed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Communautés", description: "Les communautés de TY Space." };

export default async function CommunitiesPage() {
  const communities = await loadCommunities();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Communautés</h1>
      <p className="mt-1 text-sm text-muted">Rejoignez un espace et publiez avec les autres.</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((community) => (
          <li key={community.id}>
            <CommunityCard community={community} />
          </li>
        ))}
      </ul>
      {communities.length === 0 ? <p className="mt-4 text-sm text-muted">Les communautés apparaîtront ici.</p> : null}
    </div>
  );
}
