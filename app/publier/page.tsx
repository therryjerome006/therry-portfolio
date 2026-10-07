import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Composer } from "@/components/network/Composer";
import { loadCommunities } from "@/lib/network/feed";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Créer", robots: { index: false, follow: false } };

export default async function PublishPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const kind = params.type === "photo" || params.type === "video" ? params.type : "text";
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/publier?type=${kind}`)}`);
  const communities = await loadCommunities();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold text-ink">Créer</h1>
      <p className="mt-1 text-sm text-muted">Un twit, une photo ou une vidéo de 15 secondes.</p>
      <div className="mt-4">
        <Composer initialKind={kind} communities={communities} />
      </div>
    </div>
  );
}
