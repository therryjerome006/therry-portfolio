import Link from "next/link";
import { EmptyState, OpportunityCard, ServiceCard, TalentCard } from "@/components/talents/Cards";
import { categoryTree, loadCategories, loadOpportunities, loadServices, loadTalentDirectory, searchServices } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TalentsHome() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const [talents, services, opportunities, categories] = await Promise.all([
    loadTalentDirectory(0),
    loadServices(0),
    loadOpportunities(0),
    loadCategories(),
  ]);
  const groups = categoryTree(categories);
  let recommendations: Awaited<ReturnType<typeof searchServices>> = [];
  if (user && supabase) {
    const { data } = await supabase.from("talent_profile_categories").select("category_id").eq("user_id", user.id);
    const category = categories.find((item) => item.id === data?.[0]?.category_id);
    if (category) recommendations = await searchServices({ categorie: category.slug, page: 0 });
  }

  return (
    <>
      <header className="grid gap-4">
        <div>
          <p className="text-sm font-semibold text-[#1557c0]">Talents & Services</p>
          <h1 className="mt-1 text-3xl font-bold">Trouvez une prestation ou proposez la vôtre</h1>
        </div>
        <form action="/talents/recherche" className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold">
            Recherche
            <input name="q" className="field" placeholder="Service, talent, compétence, projet" />
          </label>
          <button className="btn btn-primary self-end" type="submit">Rechercher</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {user ? <Link href="/talents/services/nouveau" className="btn btn-primary">Proposer un service</Link> : <Link href="/connexion?next=/talents/services/nouveau" className="btn btn-primary">Se connecter pour publier</Link>}
          {user ? <Link href="/talents/opportunites/nouveau" className="btn btn-line">Publier un projet</Link> : null}
        </div>
      </header>

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Catégories</h2>
          <Link href="/talents/categories" className="text-sm font-semibold text-[#1557c0]">Toutes les catégories</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {groups.slice(0, 8).map((group) => (
            <li key={group.parent.id} className="panel p-4">
              <Link href={`/talents/categories/${group.parent.slug}`} className="font-bold">{group.parent.name}</Link>
              <ul className="mt-2 grid gap-1">
                {group.children.slice(0, 4).map((child) => (
                  <li key={child.id}><Link href={`/talents/categories/${child.slug}`} className="text-sm text-muted hover:text-[#1557c0]">{child.name}</Link></li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Nouveaux services</h2>
        {services.length === 0 ? <EmptyState title="Aucun service" text="Les offres publiées par les membres s'afficheront ici. Rien n'est inventé." href={user ? "/talents/services/nouveau" : undefined} action={user ? "Proposer un service" : undefined} /> : (
          <ul className="grid gap-3 sm:grid-cols-2">{services.slice(0, 4).map((service) => <li key={service.id}><ServiceCard service={service} /></li>)}</ul>
        )}
        <p className="text-xs text-muted">Classement par date de publication. Aucune popularité n'est inventée.</p>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Talents à découvrir</h2>
        {talents.length === 0 ? <EmptyState title="Aucun talent publié" text="Les vitrines apparaissent ici quand un membre publie réellement son profil professionnel." href={user ? "/talents/moi" : "/connexion?next=/talents/moi"} action={user ? "Créer ma vitrine" : "Se connecter"} /> : (
          <ul className="grid gap-3 sm:grid-cols-2">{talents.slice(0, 4).map((person) => <li key={person.userId}><TalentCard person={person} /></li>)}</ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Projets récents</h2>
        {opportunities.length === 0 ? <EmptyState title="Aucun projet visible" text="Une mission n'apparaît que si elle est publiée et admissible pour vous." href={user ? "/talents/opportunites/nouveau" : undefined} action={user ? "Publier un projet" : undefined} /> : (
          <ul className="grid gap-3 sm:grid-cols-2">{opportunities.slice(0, 4).map((item) => <li key={item.id}><OpportunityCard item={item} /></li>)}</ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Compétences recherchées</h2>
        {opportunities.length === 0 ? <EmptyState title="Aucune compétence demandée" text="Elles apparaîtront à partir des projets réellement publiés." /> : <p className="text-sm text-muted">Ouvrez un projet pour voir les compétences demandées par son auteur.</p>}
      </section>

      {user ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-bold">Selon vos catégories</h2>
          {recommendations.length === 0 ? <EmptyState title="Pas encore de correspondance" text="Ajoutez une catégorie à votre profil pour voir les services correspondants." href="/talents/moi" action="Compléter mon profil" /> : (
            <ul className="grid gap-3 sm:grid-cols-2">{recommendations.slice(0, 4).map((service) => <li key={service.id}><ServiceCard service={service} /></li>)}</ul>
          )}
        </section>
      ) : null}
    </>
  );
}
