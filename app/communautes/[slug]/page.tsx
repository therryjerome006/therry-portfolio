import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinButton } from "@/components/network/JoinButton";
import { MemberGroups } from "@/components/network/MemberGroups";
import { PostCard } from "@/components/network/PostCard";
import { SchoolGroup } from "@/components/network/SchoolGroup";
import { canJoinSchool } from "@/lib/network/constants";
import { communityCounts, loadCommunity, loadCommunityGroups, loadCommunityPosts, loadMemberGroups } from "@/lib/network/feed";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const community = await loadCommunity(slug);
  if (!community) return {};
  return { title: community.name, description: community.description };
}

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params;
  const community = await loadCommunity(slug);
  if (!community) notFound();
  const supabase = await createClient();
  const userId = supabase ? (await supabase.auth.getUser()).data.user?.id ?? null : null;
  const [counts, posts, groups, memberGroups, profile] = await Promise.all([
    communityCounts(community.id, userId),
    loadCommunityPosts(community.id),
    loadCommunityGroups(community.id, userId),
    loadMemberGroups(community.id, userId),
    userId && supabase ? supabase.from("profiles").select("age_band").eq("id", userId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canJoin = canJoinSchool(profile.data?.age_band || "");

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Communauté</p>
      <h1 className="mt-1 text-3xl font-bold">{community.name}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{community.description}</p>
      <p className="mt-2 text-sm font-semibold">{counts.members} membres</p>
      <div className="mt-4">
        <JoinButton communityId={community.id} joined={counts.joined} />
      </div>
      <section className="mt-6">
        <h2 className="text-lg font-bold">Groupes</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Vous pouvez publier dans {community.name} sans faire partie d&apos;un groupe. L&apos;insigne d&apos;une école est facultatif.</p>
        <div className="mt-3 grid gap-3">
          {groups.map((group) => (
            <SchoolGroup key={group.id} group={group} slug={community.slug} signedIn={Boolean(userId)} canJoin={canJoin} />
          ))}
        </div>
        <h3 className="mt-6 text-base font-bold">Autres groupes</h3>
        <p className="mt-1 text-sm leading-6 text-muted">N&apos;importe quel membre peut créer un groupe et l&apos;administrer, sans demande. L&apos;administration peut le surveiller, l&apos;avertir, le signaler ou le fermer.</p>
        <div className="mt-3">
          <MemberGroups communityId={community.id} slug={community.slug} signedIn={Boolean(userId)} groups={memberGroups} />
        </div>
      </section>
      <div className="mt-6 grid gap-3">
        {posts.length === 0 ? <p className="text-sm text-muted">Aucune publication dans cette communauté.</p> : null}
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
