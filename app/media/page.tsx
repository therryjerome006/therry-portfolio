import type { Metadata } from "next";
import { MediaFilters } from "@/components/media/MediaFilters";
import { MediaGrid } from "@/components/media/MediaGrid";
import { MediaSearch } from "@/components/media/MediaSearch";
import { Container } from "@/components/layout/Section";
import { mediaCategories, mediaTypes } from "@/lib/media/constants";
import { listMedia } from "@/lib/media/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media",
  description: "Photos, vidéos, galeries et mises à jour du travail de Therry Adler Jérôme.",
  alternates: { canonical: "/media" },
};

function readFilter(filter: string) {
  if (mediaTypes.includes(filter as (typeof mediaTypes)[number])) return { type: filter, category: "" };
  if (mediaCategories.includes(filter as (typeof mediaCategories)[number])) return { type: "", category: filter };
  return { type: "", category: "" };
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? "all";
  const selected = readFilter(filter);
  const posts = await listMedia({
    publishedOnly: true,
    query: params.q,
    type: selected.type,
    category: selected.category,
  });

  return (
    <Container className="py-16">
      <p className="kicker">Media</p>
      <h1 className="display mt-4 text-5xl text-ink sm:text-6xl">Journal</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
        Photos, vidéos, démonstrations et coulisses. Un espace à part des articles.
      </p>
      <div className="mt-8 grid gap-4">
        <MediaSearch initial={params.q ?? ""} />
        <MediaFilters active={mediaTypes.includes(filter as (typeof mediaTypes)[number]) || mediaCategories.includes(filter as (typeof mediaCategories)[number]) ? filter : "all"} query={params.q ?? ""} />
      </div>
      {posts.length === 0 ? (
        <div className="mt-10 border-[3px] border-[#12263f] bg-white px-6 py-14 text-center">
          <p className="text-lg font-bold">Aucune publication pour le moment.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Les photos, vidéos et mises à jour publiées apparaîtront dans cette galerie.
          </p>
        </div>
      ) : (
        <div className="mt-10">
          <MediaGrid posts={posts} />
        </div>
      )}
    </Container>
  );
}
