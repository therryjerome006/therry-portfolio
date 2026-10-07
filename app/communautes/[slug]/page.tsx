import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JoinButton } from "@/components/network/JoinButton";
import { PostCard } from "@/components/network/PostCard";
import { communityCounts, loadCommunity, loadCommunityPosts } from "@/lib/network/feed";
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
  const [counts, posts] = await Promise.all([communityCounts(community.id, userId), loadCommunityPosts(community.id)]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">Communauté</p>
      <h1 className="mt-1 text-3xl font-bold">{community.name}</h1>
      <p className="mt-2 text-sm leading-6 text-muted">{community.description}</p>
      <p className="mt-2 text-sm font-semibold">{counts.members} membres</p>
      <div className="mt-4">
        <JoinButton communityId={community.id} joined={counts.joined} />
      </div>
      <div className="mt-6 grid gap-3">
        {posts.length === 0 ? <p className="text-sm text-muted">Aucune publication dans cette communauté.</p> : null}
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
