import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/network/JoinButton";
import { PostCard } from "@/components/network/PostCard";
import { ReportButton } from "@/components/network/ReportButton";
import { ShareLink } from "@/components/network/ShareLink";
import { categoryLabel } from "@/lib/editorial/constants";
import { loadEditorialProfile } from "@/lib/editorial/public";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ onglet?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await loadEditorialProfile((await params).slug);
  if (!page) return {};
  return { title: page.profile.name, description: page.profile.description || "Profil éditorial TY Space" };
}

export default async function EditorialProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const tab = (await searchParams).onglet ?? "publications";
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) notFound();
  const page = await loadEditorialProfile(slug);
  if (!page) notFound();
  const { profile, posts, articles } = page;
  const supabase = await createClient();
  const me = supabase ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
  const [followers, relation, publications] = await Promise.all([
    supabase ? supabase.from("follows").select("*", { count: "exact", head: true }).eq("editorial_id", profile.id) : Promise.resolve({ count: 0 }),
    me && supabase ? supabase.from("follows").select("follower_id").eq("follower_id", me).eq("editorial_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      ? supabase.from("editorial_items").select("*", { count: "exact", head: true }).eq("profile_id", profile.id).eq("status", "published").lte("published_at", new Date().toISOString())
      : Promise.resolve({ count: posts.length + articles.length }),
  ]);
  const path = `/redaction/${profile.slug}`;
  const photos = posts.filter((post) => post.kind === "photo");
  const videos = posts.filter((post) => post.kind === "video");
  const shown = tab === "photos" ? photos : tab === "videos" ? videos : posts;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center bg-[#e4edf8] text-2xl font-bold">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-16 w-16 object-cover" />
          ) : (
            profile.name.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{profile.name}</h1>
          <p className="truncate text-sm text-muted">@{profile.slug}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-accent">Profil éditorial · {categoryLabel(profile.category)}</p>
        </div>
      </div>
      {profile.description ? <p className="mt-4 leading-6">{profile.description}</p> : null}
      <p className="mt-3 text-sm">
        <span className="font-bold">{followers.count ?? 0}</span> abonnés · <span className="font-bold">{publications.count ?? 0}</span> publications
      </p>
      {!profile.is_active ? <p className="mt-2 text-sm text-muted">Ce profil ne prépare pas de nouvelle publication pour le moment. Les publications déjà en ligne restent visibles.</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <FollowButton editorialId={profile.id} following={Boolean(relation.data)} path={path} />
        <ShareLink path={path} label="Partager" />
        <ReportButton targetType="editorial" targetId={profile.id} path={path} />
      </div>
      {!me ? <p className="mt-2 text-sm text-muted">Connectez-vous pour suivre ce profil. La lecture reste ouverte.</p> : null}
      <div className="mt-6 flex gap-3 overflow-x-auto text-sm font-semibold">
        {[
          ["publications", "Publications"],
          ["articles", "Articles"],
          ["photos", "Photos"],
          ["videos", "Vidéos"],
        ].map(([id, label]) => (
          <Link key={id} href={id === "publications" ? path : `${path}?onglet=${id}`} className={`shrink-0 ${tab === id ? "text-ink" : "text-muted"}`}>
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {tab === "articles"
          ? articles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`} className="border border-line bg-white p-4 font-semibold">
                {article.title}
              </Link>
            ))
          : shown.map((post) => <PostCard key={post.id} post={post} />)}
        {tab === "articles" && articles.length === 0 ? <p className="text-sm text-muted">Aucun article.</p> : null}
        {tab !== "articles" && shown.length === 0 ? <p className="text-sm text-muted">Aucune publication.</p> : null}
      </div>
    </div>
  );
}
