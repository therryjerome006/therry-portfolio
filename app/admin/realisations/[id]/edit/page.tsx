import { notFound } from "next/navigation";
import { ActivityComposer } from "@/components/admin/ActivityComposer";
import { getActivityPost } from "@/lib/activities/db";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function EditActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const post = await getActivityPost(id);
  if (!post) notFound();

  return (
    <div>
      <div className="border-t-[8px] border-[#1d6fe8] bg-white px-5 py-7 sm:px-7">
        <p className="kicker">Réalisations</p>
        <h1 className="display mt-3 text-4xl text-ink">Modifier</h1>
      </div>
      <div className="mt-6">
        <ActivityComposer post={post} saved={query.saved === "1"} />
      </div>
    </div>
  );
}
