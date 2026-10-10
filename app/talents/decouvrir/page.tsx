import { EmptyState, TalentCard } from "@/components/talents/Cards";
import { searchTalents, loadCategories } from "@/lib/talents/queries";
import { talentLanguages } from "@/lib/talents/rules";

export const dynamic = "force-dynamic";

export default async function DiscoverTalents({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const page = Number(query.page ?? 0) || 0;
  const [people, categories] = await Promise.all([
    searchTalents({ q: query.q, categorie: query.categorie, dispo: query.dispo, langue: query.langue, page }),
    loadCategories(),
  ]);
  const next = new URLSearchParams({ ...query, page: String(page + 1) });
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Talents</h1>
      <form action="/talents/decouvrir" className="market-filters">
        <input name="q" defaultValue={query.q ?? ""} placeholder="Nom, pseudo, titre" aria-label="Recherche" />
        <select name="categorie" defaultValue={query.categorie ?? ""} aria-label="Catégorie">
          <option value="">Toutes les catégories</option>
          {categories.filter((item) => item.active).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
        </select>
        <select name="dispo" defaultValue={query.dispo ?? ""} aria-label="Disponibilité">
          <option value="">Toute disponibilité</option>
          <option value="disponible">Disponible</option>
          <option value="limitee">Disponibilité limitée</option>
          <option value="indisponible">Indisponible</option>
        </select>
        <select name="langue" defaultValue={query.langue ?? ""} aria-label="Langue">
          <option value="">Toutes les langues</option>
          {talentLanguages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
        <button type="submit">Afficher les talents filtrés</button>
        <a className="market-ghost" href="/talents/decouvrir">Effacer les filtres</a>
      </form>
      {people.length === 0 ? <EmptyState title="Aucun résultat" text="Aucun profil publié ne correspond à ces filtres." /> : (
        <ul className="market-gigs">{people.map((person) => <li key={person.userId}><TalentCard person={person} /></li>)}</ul>
      )}
      {people.length >= 12 ? <a className="btn btn-line w-fit" href={`/talents/decouvrir?${next}`}>Page suivante</a> : null}
    </>
  );
}
