import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BlockButton, FollowButton } from "@/components/network/JoinButton";
import { ArticleCard } from "@/components/journal/ArticleCard";
import { PersonCard } from "@/components/network/PersonCard";
import { PostCard } from "@/components/network/PostCard";
import { ProfileActivity } from "@/components/network/ProfileActivity";
import { ReportButton } from "@/components/network/ReportButton";
import { ShareLink } from "@/components/network/ShareLink";
import { socialUsername } from "@/data/profile";
import { formatDate } from "@/lib/format";
import { loadProfileActivity, loadProfilePosts } from "@/lib/network/feed";
import { getProfileByUsername, previousProfileUsername } from "@/lib/social/queries";
import { loadPublicRelations, relationCounts } from "@/lib/social/space";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ onglet?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getProfileByUsername((await params).username);
  if (!profile) return {};
  return { title: profile.displayName, description: profile.bio || `Profil de ${profile.displayName}` };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const tab = (await searchParams).onglet ?? "publications";
  const profile = await getProfileByUsername(username);
  if (!profile) {
    const current = await previousProfileUsername(username);
    if (current) redirect(`/profil/${current}`);
    notFound();
  }
  const supabase = await createClient();
  const me = supabase ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
  const mine = me === profile.id;
  const [counts, publicationCount, relation, blocked, posts, photos, videos, articles, activity, relations] = await Promise.all([
    relationCounts(profile.id),
    supabase ? supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "published") : Promise.resolve({ count: 0 }),
    me && supabase ? supabase.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    me && supabase ? supabase.from("blocks").select("blocker_id").eq("blocker_id", me).eq("blocked_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    loadProfilePosts(profile.id),
    loadProfilePosts(profile.id, "photo"),
    loadProfilePosts(profile.id, "video"),
    supabase
      ? supabase.from("community_articles").select("id, title, body, category, cover_url").eq("user_id", profile.id).eq("status", "published").order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [] as { id: string; title: string; body: string; category: string | null; cover_url: string | null }[] }),
    loadProfileActivity(profile.id, me),
    mine || profile.showRelations ? loadPublicRelations(supabase, profile.id) : Promise.resolve({ followers: [], following: [] }),
  ]);
  const path = `/profil/${profile.username}`;
  const shown = tab === "photos" ? photos : tab === "videos" ? videos : posts;
  const developer = profile.username === socialUsername || profile.isAdmin;
  const administered = activity.groups.filter((group) => group.role === "admin").length;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center bg-[#e4edf8] text-2xl font-bold">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-16 w-16 object-cover" />
          ) : (
            profile.displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>
      </div>
      {profile.bio ? <p className="mt-4 leading-6">{profile.bio}</p> : null}
      {profile.interests ? <p className="mt-2 text-sm text-muted">{profile.interests}</p> : null}
      {profile.website ? (
        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-accent">
          {profile.website.replace(/^https:\/\//, "")}
        </a>
      ) : null}
      <p className="mt-3 text-sm">
        <span className="font-bold">{publicationCount.count ?? 0}</span> {publicationCount.count === 1 ? "publication" : "publications"} · <span className="font-bold">{counts.followers}</span> {counts.followers === 1 ? "abonné" : "abonnés"} · <span className="font-bold">{counts.following}</span> {counts.following === 1 ? "abonnement" : "abonnements"}
      </p>
      <p className="mt-1 text-sm text-muted">
        {administered} {administered > 1 ? "groupes administrés" : "groupe administré"} · {activity.communities.length} {activity.communities.length > 1 ? "communautés" : "communauté"}
      </p>
      <p className="mt-1 text-xs text-muted">Inscrit le {formatDate(profile.createdAt)}</p>
      {developer ? (
        <Link href="/developpeur" className="mt-3 inline-block text-sm font-semibold text-accent">
          Découvrir mon espace développeur
        </Link>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {mine ? <Link href="/profil?espace=modifier" className="text-sm font-semibold">Modifier le profil</Link> : (
          <>
            <FollowButton userId={profile.id} following={Boolean(relation.data)} path={path} />
            <BlockButton userId={profile.id} blocked={Boolean(blocked.data)} path={path} />
            <ReportButton targetType="profile" targetId={profile.id} path={path} />
          </>
        )}
        <ShareLink path={path} label="Partager" />
      </div>
      <div className="mt-6 flex gap-3 overflow-x-auto text-sm font-semibold">
        {[
          ["publications", "Publications"],
          ["articles", "Articles"],
          ["photos", "Photos"],
          ["videos", "Vidéos"],
          ["activite", "Activité"],
          ...(mine || profile.showRelations ? [["relations", "Abonnements"] as const] : []),
        ].map(([id, label]) => (
          <Link key={id} href={id === "publications" ? path : `${path}?onglet=${id}`} className={tab === id ? "text-ink" : "text-muted"}>
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {tab === "activite" ? <ProfileActivity activity={activity} mine={mine} path={path} /> : null}
        {tab === "relations" && (mine || profile.showRelations) ? (
          <div className="grid gap-4">
            <div className="grid gap-3">
              <h2 className="font-bold">Abonnés</h2>
              {relations.followers.map((person) => (
                <PersonCard key={person.id} href={`/profil/${person.username}`} name={person.name} username={person.username} avatarUrl={person.avatarUrl} bio={person.bio} />
              ))}
              {relations.followers.length === 0 ? <p className="text-sm text-muted">Aucun abonné.</p> : null}
            </div>
            <div className="grid gap-3">
              <h2 className="font-bold">Abonnements</h2>
              {relations.following.map((person) => (
                <PersonCard key={person.id} href={`/profil/${person.username}`} name={person.name} username={person.username} avatarUrl={person.avatarUrl} bio={person.bio} />
              ))}
              {relations.following.length === 0 ? <p className="text-sm text-muted">Aucun abonnement.</p> : null}
            </div>
          </div>
        ) : null}
        {tab === "articles"
          ? (articles.data ?? []).map((article) => (
              <ArticleCard
                key={article.id}
                id={article.id}
                title={article.title}
                category={article.category || ""}
                cover={article.cover_url || ""}
                excerpt={article.body.replace(/\s+/g, " ").trim().slice(0, 180)}
              />
            ))
          : null}
        {tab !== "articles" && tab !== "activite" && tab !== "relations" ? shown.map((post) => <PostCard key={post.id} post={post} />) : null}
        {tab === "articles" && (articles.data ?? []).length === 0 ? <p className="text-sm text-muted">Aucun article.</p> : null}
        {tab !== "articles" && tab !== "activite" && tab !== "relations" && shown.length === 0 ? <p className="text-sm text-muted">Aucune publication.</p> : null}
      </div>
    </div>
  );
}
