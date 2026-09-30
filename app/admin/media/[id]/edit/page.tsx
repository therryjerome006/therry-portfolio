import { notFound } from "next/navigation";
import { MediaEditor } from "@/components/admin/MediaEditor";
import { requireAdmin } from "@/lib/auth/session";
import { getMediaById } from "@/lib/media/db";

export default async function EditMediaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const post = await getMediaById(id);
  if (!post) notFound();

  return (
    <div>
      <div className="border-t-[8px] border-[#1d6fe8] bg-white px-5 py-7 sm:px-7">
        <p className="kicker">Media</p>
        <h1 className="display mt-3 text-4xl text-ink">Modifier</h1>
      </div>
      <div className="mt-6">
        <MediaEditor post={post} saved={query.saved === "1"} />
      </div>
    </div>
  );
}
