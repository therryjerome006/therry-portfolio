import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArticleForm } from "@/components/network/ArticleForm";
import { audienceChoices, defaultAudience } from "@/lib/network/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Écrire un article", robots: { index: false, follow: false } };

export default async function WriteArticlePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect("/connexion?next=/articles/ecrire");
  const profile = await supabase.from("profiles").select("age_band").eq("id", user.id).maybeSingle();
  const ageBand = profile.data?.age_band || "unknown";
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold">Écrire un article</h1>
      <p className="mt-1 text-sm text-muted">Un texte plus long qu&apos;un twit. Votre nom d&apos;utilisateur sera affiché, pas votre e-mail. Les contenus pour adultes sont interdits.</p>
      <div className="mt-4">
        <ArticleForm choices={audienceChoices(ageBand)} defaults={defaultAudience(ageBand)} />
      </div>
    </div>
  );
}
