import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/network/PostCard";
import { SectionTabs } from "@/components/network/SectionTabs";
import { feedTabs, isFeedTab } from "@/lib/network/constants";
import { loadFeed } from "@/lib/network/feed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accueil",
  description: "Le fil de TY Space : twits, photos et vidéos courtes de la communauté.",
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ onglet?: string; page?: string }> }) {
  const params = await searchParams;
  const requested = params.onglet ?? "pour-toi";
  const tab = isFeedTab(requested) ? requested : "pour-toi";
  const page = Math.max(0, Number(params.page ?? "0") || 0);
  const feed = await loadFeed(tab, page);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-4 px-4 py-4">
      <SectionTabs
        label="Fil"
        active={tab}
        items={feedTabs.map((item) => [item.id, item.label] as const)}
        hrefFor={(id) => (id === "pour-toi" ? "/" : `/?onglet=${id}`)}
      />

      {!feed.ready ? (
        <p className="panel p-4 text-sm leading-6 text-muted">Le fil sera disponible dès que la base du réseau est en place.</p>
      ) : null}

      {feed.ready && "needsAuth" in feed && feed.needsAuth ? (
        <p className="panel p-4 text-sm leading-6">
          Connectez-vous pour voir les publications des personnes que vous suivez.{" "}
          <Link href="/connexion?next=/?onglet=suivis" className="font-semibold">
            Se connecter
          </Link>
        </p>
      ) : null}

      {feed.ready && feed.posts.length === 0 && !("needsAuth" in feed && feed.needsAuth) ? (
        <p className="panel p-4 text-sm leading-6 text-muted">Aucune publication pour le moment. Les twits, photos et vidéos de la communauté apparaîtront ici.</p>
      ) : null}

      <div className="grid gap-3">
        {feed.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {feed.hasMore ? (
        <Link href={`/?onglet=${tab}&page=${page + 1}`} className="btn btn-line w-full">
          Publications plus anciennes
        </Link>
      ) : null}
    </div>
  );
}
