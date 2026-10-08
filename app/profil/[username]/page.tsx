import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockButton, FollowButton } from "@/components/network/JoinButton";
import { PostCard } from "@/components/network/PostCard";
import { ProfileActivity } from "@/components/network/ProfileActivity";
import { ReportButton } from "@/components/network/ReportButton";
import { socialUsername } from "@/data/profile";
import { formatDate } from "@/lib/format";
import { loadProfileActivity, loadProfilePosts } from "@/lib/network/feed";
import { getProfileByUsername } from "@/lib/social/queries";
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
  if (!profile) notFound();
  const supabase = await createClient();
  const me = supabase ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
  const mine = me === profile.id;
  const [followers, following, relation, blocked, posts, photos, videos, articles, activity] = await Promise.all([
    supabase ? supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id) : Promise.resolve({ count: 0 }),
    supabase ? supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id) : Promise.resolve({ count: 0 }),
    me && supabase ? supabase.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    me && supabase ? supabase.from("blocks").select("blocker_id").eq("blocker_id", me).eq("blocked_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
    loadProfilePosts(profile.id),
    loadProfilePosts(profile.id, "photo"),
    loadProfilePosts(profile.id, "video"),
    supabase
      ? supabase.from("community_articles").select("id, title, created_at").eq("user_id", profile.id).eq("status", "published").order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [] }),
    loadProfileActivity(profile.id, me),
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
      <p className="mt-3 text-sm">
        <span className="font-bold">{followers.count ?? 0}</span> abonnés · <span className="font-bold">{following.count ?? 0}</span> abonnements
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
      {!mine ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <FollowButton userId={profile.id} following={Boolean(relation.data)} path={path} />
          <BlockButton userId={profile.id} blocked={Boolean(blocked.data)} path={path} />
          <ReportButton targetType="profile" targetId={profile.id} path={path} />
        </div>
      ) : (
        <Link href="/profil" className="mt-4 inline-block text-sm font-semibold">
          Modifier le profil
        </Link>
      )}
      <div className="mt-6 flex gap-3 overflow-x-auto text-sm font-semibold">
        {[
          ["publications", "Publications"],
          ["articles", "Articles"],
          ["photos", "Photos"],
          ["videos", "Vidéos"],
          ["activite", "Activité"],
        ].map(([id, label]) => (
          <Link key={id} href={id === "publications" ? path : `${path}?onglet=${id}`} className={tab === id ? "text-ink" : "text-muted"}>
            {label}
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {tab === "activite" ? <ProfileActivity activity={activity} mine={mine} path={path} /> : null}
        {tab === "articles"
          ? (articles.data ?? []).map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`} className="border border-line bg-white p-4 font-semibold">
                {article.title}
              </Link>
            ))
          : null}
        {tab !== "articles" && tab !== "activite" ? shown.map((post) => <PostCard key={post.id} post={post} />) : null}
        {tab === "articles" && (articles.data ?? []).length === 0 ? <p className="text-sm text-muted">Aucun article.</p> : null}
        {tab !== "articles" && tab !== "activite" && shown.length === 0 ? <p className="text-sm text-muted">Aucune publication.</p> : null}
      </div>
    </div>
  );
}
