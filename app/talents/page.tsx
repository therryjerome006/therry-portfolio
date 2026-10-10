import Link from "next/link";
import { CategoryArt } from "@/components/talents/CategoryArt";
import { EmptyState, OpportunityCard, ServiceCard, TalentCard } from "@/components/talents/Cards";
import { ScrollRow } from "@/components/talents/ScrollRow";
import { categoryTree, loadCategories, loadOpportunities, loadServices, loadTalentDirectory } from "@/lib/talents/queries";
import { profileProgress } from "@/lib/talents/rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TalentsHome() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const [talents, services, opportunities, categories, profile] = await Promise.all([
    loadTalentDirectory(0),
    loadServices(0),
    loadOpportunities(0),
    loadCategories(),
    user && supabase ? supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const groups = categoryTree(categories);
  let progress = 0;
  if (user && supabase) {
    const [{ data: talent }, categoriesCount, skillsCount] = await Promise.all([
      supabase.from("talent_profiles").select("display_name, title, bio, availability, languages").eq("user_id", user.id).maybeSingle(),
      supabase.from("talent_profile_categories").select("category_id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("talent_skills").select("skill_id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    const state = profileProgress({
      name: talent?.display_name ?? "",
      title: talent?.title ?? "",
      bio: talent?.bio ?? "",
      categories: categoriesCount.count ?? 0,
      skills: skillsCount.count ?? 0,
      availability: talent?.availability ?? "",
      languages: Array.isArray(talent?.languages) ? talent.languages.length : 0,
    });
    progress = Math.round((state.done / state.total) * 100);
  }
  const name = profile.data?.display_name || "";

  return (
    <>
      <section className="market-hero">
        <div className="market-wrap" style={{ paddingBottom: 0 }}>
          <h1>{user ? `Bon retour${name ? `, ${name}` : ""}` : "Quel service cherchez-vous aujourd'hui ?"}</h1>
          <div className="market-suggest">
            <Link href={user ? "/talents/opportunites/nouveau" : "/connexion?next=/talents/opportunites/nouveau"}>
              <span className="market-icon" aria-hidden="true">＋</span>
              <span>
                <small>Pour les clients</small>
                <strong>Publier un projet</strong>
                <p>Décrivez un besoin et recevez des propositions.</p>
              </span>
            </Link>
            <Link href={user ? "/talents/services/nouveau" : "/connexion?next=/talents/services/nouveau"}>
              <span className="market-icon" aria-hidden="true">▣</span>
              <span>
                <small>Pour les prestataires</small>
                <strong>Proposer un service</strong>
                <p>Présentez une offre, avec un prix indicatif.</p>
              </span>
            </Link>
            <Link href={user ? "/talents/moi" : "/connexion?next=/talents/moi"}>
              <span className="market-icon" aria-hidden="true">{progress}%</span>
              <span>
                <small>{user ? "Profil professionnel" : "Compte"}</small>
                <strong>{user ? `Profil complété à ${progress} %` : "Se connecter"}</strong>
                <p>{user ? "Ce pourcentage compte uniquement les champs déjà remplis." : "Un seul compte pour la communauté et les services."}</p>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="market-section">
        <h2>D'après les catégories disponibles</h2>
        <ScrollRow>
          <Link href="/talents/categories" className="market-explore">Continuer à explorer</Link>
          {groups.map((group) => (
            <Link key={group.parent.id} href={`/talents/categories/${group.parent.slug}`} className="gig">
              <CategoryArt slug={group.parent.slug} title={group.parent.name} />
              <span className="gig-title">{group.parent.name}</span>
            </Link>
          ))}
        </ScrollRow>
      </section>

      <section className="market-section">
        <h2>Nouveaux services</h2>
        {services.length === 0 ? <EmptyState title="Aucun service publié" text="Les offres des membres apparaîtront ici, avec leur image et leur prix de départ." href={user ? "/talents/services/nouveau" : "/connexion?next=/talents/services/nouveau"} action={user ? "Proposer un service" : "Se connecter"} /> : (
          <ul className="market-gigs">{services.slice(0, 8).map((service) => <li key={service.id}><ServiceCard service={service} /></li>)}</ul>
        )}
        <p className="market-muted">Classement par date de publication. Aucune popularité n'est calculée.</p>
      </section>

      <section className="market-section">
        <h2>Talents à découvrir</h2>
        {talents.length === 0 ? <EmptyState title="Aucune vitrine publiée" text="Un talent apparaît ici seulement après avoir publié son profil." href={user ? "/talents/moi" : "/connexion?next=/talents/moi"} action={user ? "Créer ma vitrine" : "Se connecter"} /> : (
          <ul className="market-gigs">{talents.slice(0, 4).map((person) => <li key={person.userId}><TalentCard person={person} /></li>)}</ul>
        )}
      </section>

      <section className="market-section">
        <h2>Projets récents</h2>
        {opportunities.length === 0 ? <EmptyState title="Aucun projet visible" text="Une mission s'affiche quand elle est publiée et admissible pour vous." href={user ? "/talents/opportunites/nouveau" : undefined} action={user ? "Publier un projet" : undefined} /> : (
          <ul className="market-gigs">{opportunities.slice(0, 4).map((item) => <li key={item.id}><OpportunityCard item={item} /></li>)}</ul>
        )}
      </section>
    </>
  );
}
