import { redirect } from "next/navigation";
import { AuthorizationButton } from "@/components/talents/forms";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TalentSettingsPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect("/connexion?next=/talents/moi/reglages");
  const [{ data: policy }, { data: authorization }, { data: profile }] = await Promise.all([
    supabase.from("talent_policy").select("paid_minors_enabled, org_offers_enabled").eq("id", 1).maybeSingle(),
    supabase.from("talent_authorizations").select("status, created_at").eq("user_id", user.id).eq("kind", "parental_paid").maybeSingle(),
    supabase.from("talent_profiles").select("status, show_public").eq("user_id", user.id).maybeSingle(),
  ]);
  return (
    <>
      <h1 className="text-3xl font-bold">Paramètres professionnels</h1>
      <div className="panel grid gap-2 p-4 text-sm leading-6">
        <p>Vitrine : {profile?.show_public && profile.status === "published" ? "publique" : "non publiée"}.</p>
        <p>Missions rémunérées pour les moins de 18 ans : {policy?.paid_minors_enabled ? "contrôle ouvert" : "fermées par le serveur"}.</p>
        <p>Offres d'organisations vers les mineurs : {policy?.org_offers_enabled ? "contrôle ouvert" : "en vérification obligatoire"}.</p>
        <p>Autorisation enregistrée : {authorization?.status ?? "aucune"}.</p>
        <p>Ces interrupteurs ne remplacent pas une validation juridique. Une case cochée dans le navigateur n'est pas une preuve.</p>
      </div>
      <AuthorizationButton />
    </>
  );
}
