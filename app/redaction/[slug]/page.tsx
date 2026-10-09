import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArticleCard } from "@/components/journal/ArticleCard";
import { FollowButton } from "@/components/network/JoinButton";
import { PersonCard } from "@/components/network/PersonCard";
import { PostCard } from "@/components/network/PostCard";
import { ReportButton } from "@/components/network/ReportButton";
import { ShareLink } from "@/components/network/ShareLink";
import { categoryLabel } from "@/lib/editorial/constants";
import { loadEditorialProfile, previousEditorialSlug } from "@/lib/editorial/public";
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
  if (!page) {
    const current = await previousEditorialSlug(slug);
    if (current && current !== slug) redirect(`/redaction/${current}`);
    notFound();
  }
  const { profile, posts, articles } = page;
  const supabase = await createClient();
  const me = supabase ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
  const [followers, relation, publications, followerRows] = await Promise.all([
    supabase ? supabase.from("follows").select("*", { count: "exact", head: true }).eq("editorial_id", profile.id) : Promise.resolve({ count: 0 }),
    me && supabase ? supabase.from("follows").select("follower_id").eq("follower_id", me).eq("editorial_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      ? supabase.from("editorial_items").select("*", { count: "exact", head: true }).eq("profile_id", profile.id).eq("status", "published").lte("published_at", new Date().toISOString())
      : Promise.resolve({ count: posts.length + articles.length }),
    supabase ? supabase.from("follows").select("follower_id").eq("editorial_id", profile.id).order("created_at", { ascending: false }).limit(40) : Promise.resolve({ data: [] as { follower_id: string }[] }),
  ]);
  const followerIds = (followerRows.data ?? []).map((row) => row.follower_id);
  const { data: followerProfiles } = supabase && followerIds.length
    ? await supabase.from("profiles").select("id, username, display_name, avatar_url, bio").in("id", followerIds)
    : { data: [] as { id: string; username: string; display_name: string; avatar_url: string | null; bio: string | null }[] };
  const followerById = new Map((followerProfiles ?? []).map((person) => [person.id, person]));
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
      {profile.description ? <p className="mt-4 whitespace-pre-wrap leading-6">{profile.description}</p> : null}
      {profile.website ? (
        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-accent">
          {profile.website.replace(/^https:\/\//, "")}
        </a>
      ) : null}
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
          ["abonnes", "Abonnés"],
        ].map(([id, label]) => (
          <Link key={id} href={id === "publications" ? path : `${path}?onglet=${id}`} className={`shrink-0 ${tab === id ? "text-ink" : "text-muted"}`}>
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {tab === "articles" ? articles.map((article) => <ArticleCard key={article.id} id={article.id} title={article.title} excerpt={article.excerpt} cover={article.cover} category={article.category} />) : null}
        {tab === "abonnes"
          ? followerIds.map((id) => {
              const person = followerById.get(id);
              if (!person) return null;
              return <PersonCard key={person.id} href={`/profil/${person.username}`} name={person.display_name} username={person.username} avatarUrl={person.avatar_url || ""} bio={person.bio || ""} />;
            })
          : null}
        {tab !== "articles" && tab !== "abonnes" ? shown.map((post) => <PostCard key={post.id} post={post} />) : null}
        {tab === "articles" && articles.length === 0 ? <p className="text-sm text-muted">Aucun article.</p> : null}
        {tab === "abonnes" && followerIds.length === 0 ? <p className="text-sm text-muted">Aucun abonné.</p> : null}
        {tab !== "articles" && tab !== "abonnes" && shown.length === 0 ? <p className="text-sm text-muted">Aucune publication.</p> : null}
      </div>
    </div>
  );
}
