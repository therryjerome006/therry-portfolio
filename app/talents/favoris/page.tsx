import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, ServiceCard, TalentCard } from "@/components/talents/Cards";
import { loadService, loadTalentByUsername } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect("/connexion?next=/talents/favoris");
  const [{ data: serviceRows }, { data: talentRows }] = await Promise.all([
    supabase.from("service_favorites").select("service_id").eq("user_id", user.id),
    supabase.from("talent_favorites").select("talent_id").eq("user_id", user.id),
  ]);
  const serviceIds = (serviceRows ?? []).map((row) => String(row.service_id));
  const talentIds = (talentRows ?? []).map((row) => String(row.talent_id));
  const { data: profiles } = talentIds.length > 0
    ? await supabase.from("profiles").select("username").in("id", talentIds)
    : { data: [] };
  const [services, talents] = await Promise.all([
    Promise.all(serviceIds.map((id) => loadService(id))),
    Promise.all((profiles ?? []).map((row) => loadTalentByUsername(String(row.username)))),
  ]);
  const savedServices = services.filter((item) => item && item.status === "published");
  const savedTalents = talents.filter((item) => item?.person);
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-bold">Favoris</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Les favoris sont privés. Ils sont distincts des abonnements du fil communautaire.</p>
      </header>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Services</h2>
        {savedServices.length === 0 ? <EmptyState title="Aucun service enregistré" text="Le bouton favori apparaît sur une fiche de service publiée." href="/talents/services" action="Voir les services" /> : (
          <ul className="grid gap-3 sm:grid-cols-2">{savedServices.map((service) => service ? <li key={service.id}><ServiceCard service={service} /></li> : null)}</ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Talents</h2>
        {savedTalents.length === 0 ? <EmptyState title="Aucun talent enregistré" text="Vous pouvez enregistrer une vitrine depuis son profil." href="/talents/decouvrir" action="Découvrir les talents" /> : (
          <ul className="grid gap-3 sm:grid-cols-2">{savedTalents.map((item) => item ? <li key={item.person.userId}><TalentCard person={item.person} /></li> : null)}</ul>
        )}
      </section>
      <p className="text-sm"><Link href="/profil?espace=relations" className="font-semibold text-accent">Voir les comptes suivis</Link></p>
    </div>
  );
}
