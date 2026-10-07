import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/network/PostCard";
import { Engagement } from "@/components/social/Engagement";
import { loadPost } from "@/lib/network/feed";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await loadPost(id);
  if (!post) return {};
  return { title: post.body.slice(0, 80) || "Publication", description: post.body.slice(0, 160) || "Publication TY Space" };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const post = await loadPost(id);
  if (!post) notFound();
  const path = `/p/${post.id}`;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <PostCard post={post} detailed />
      <div className="mt-4">
        <Engagement type="feed" id={post.id} path={path} />
      </div>
    </div>
  );
}
