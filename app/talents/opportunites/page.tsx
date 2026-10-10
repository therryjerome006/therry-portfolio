import { EmptyState, OpportunityCard } from "@/components/talents/Cards";
import { loadCategories, searchOpportunities } from "@/lib/talents/queries";
import { missionTypes } from "@/lib/talents/rules";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const [items, categories] = await Promise.all([
    searchOpportunities({ q: query.q, categorie: query.categorie, mission: query.mission, page: Number(query.page ?? 0) || 0 }),
    loadCategories(),
  ]);
  return (
    <>
      <h1 className="text-3xl font-bold">Opportunités</h1>
      <form action="/talents/opportunites" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input name="q" defaultValue={query.q ?? ""} className="field" placeholder="Titre ou description" aria-label="Recherche" />
        <select name="categorie" defaultValue={query.categorie ?? ""} className="field" aria-label="Catégorie"><option value="">Toutes</option>{categories.filter((item) => item.active).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
        <select name="mission" defaultValue={query.mission ?? ""} className="field" aria-label="Type"><option value="">Tous les types</option>{missionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <button className="btn btn-primary" type="submit">Filtrer</button>
        <a className="btn btn-line" href="/talents/opportunites">Réinitialiser</a>
      </form>
      {items.length === 0 ? <EmptyState title="Aucune mission visible" text="Les missions non admissibles pour votre âge, ou encore en vérification, ne sont pas affichées." /> : (
        <ul className="grid gap-3 sm:grid-cols-2">{items.map((item) => <li key={item.id}><OpportunityCard item={item} /></li>)}</ul>
      )}
    </>
  );
}
