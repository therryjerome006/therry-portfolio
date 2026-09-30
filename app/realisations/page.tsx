import type { Metadata } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/activities/ActivityFeed";
import { Container } from "@/components/layout/Section";
import { listActivityPosts } from "@/lib/activities/db";
import { activityCategories, type ActivityCategory } from "@/data/activities";
import { profile } from "@/data/profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Réalisations & Activités",
  description: `Activités et accomplissements de ${profile.name} en dehors de l'informatique.`,
  alternates: { canonical: "/realisations" },
};

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const params = await searchParams;
  const selected = activityCategories.includes(params.categorie as ActivityCategory)
    ? (params.categorie as ActivityCategory)
    : "";
  const posts = await listActivityPosts({ publishedOnly: true, category: selected || undefined });

  return (
    <Container className="py-16">
      <p className="kicker">Hors informatique</p>
      <h1 className="display mt-4 text-5xl text-ink sm:text-6xl">Réalisations & Activités</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
        Sport, échecs, vie scolaire, compétitions, événements et autres expériences, à côté des projets de code.
      </p>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1" role="navigation" aria-label="Catégories">
        <Filter href="/realisations" active={!selected} label="Toutes" />
        {activityCategories.map((category) => (
          <Filter
            key={category}
            href={`/realisations?categorie=${encodeURIComponent(category)}`}
            active={selected === category}
            label={category}
          />
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="mt-12 border-[3px] border-[#12263f] bg-white px-6 py-14 text-center">
          <p className="text-lg font-bold text-ink">Aucune réalisation pour le moment.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Les photos, qui défilent dans la publication, et la description du post apparaîtront ici.
          </p>
        </div>
      ) : (
        <ActivityFeed posts={posts} />
      )}
    </Container>
  );
}

function Filter({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 border px-3 py-2 text-sm font-semibold ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}
    >
      {label}
    </Link>
  );
}
