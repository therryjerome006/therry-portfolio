import Link from "next/link";
import { EmptyState, OpportunityCard, ServiceCard, TalentCard } from "@/components/talents/Cards";
import { categoryTree, loadCategories, searchMarket, type TalentCategory, type TalentOpportunity, type TalentPerson, type TalentService } from "@/lib/talents/queries";

export const dynamic = "force-dynamic";

function isService(item: TalentService | TalentPerson | TalentOpportunity | TalentCategory): item is TalentService {
  return "offerKind" in item;
}
function isTalent(item: TalentService | TalentPerson | TalentOpportunity | TalentCategory): item is TalentPerson {
  return "availability" in item;
}
function isProject(item: TalentService | TalentPerson | TalentOpportunity | TalentCategory): item is TalentOpportunity {
  return "missionType" in item;
}
function isCategory(item: TalentService | TalentPerson | TalentOpportunity | TalentCategory): item is TalentCategory {
  return "slug" in item && "active" in item;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; categorie?: string; prixMax?: string; delai?: string }> }) {
  const query = await searchParams;
  const type = query.type === "talent" || query.type === "projet" || query.type === "categorie" ? query.type : "service";
  const max = Number(query.prixMax);
  const delay = Number(query.delai);
  const categories = await loadCategories();
  const results = await searchMarket(
    type,
    query.q ?? "",
    query.categorie ?? "",
    Number.isFinite(max) && max > 0 ? Math.round(max * 100) : null,
    Number.isFinite(delay) && delay > 0 ? delay : null,
  );
  const tree = categoryTree(categories);
  return (
    <div className="grid gap-4">
      <header className="grid gap-2">
        <p className="text-sm text-muted"><Link href="/talents">Talents & Services</Link> · Recherche</p>
        <h1 className="text-3xl font-bold">{query.q ? `Résultats pour « ${query.q.slice(0, 40)} »` : "Parcourir"}</h1>
        <p className="text-sm">{results.length} résultat{results.length > 1 ? "s" : ""} accessible{results.length > 1 ? "s" : ""}.</p>
      </header>
      <form action="/talents/recherche" className="market-filters">
        <input name="q" defaultValue={query.q ?? ""} aria-label="Recherche" placeholder="Recherche" />
        <select name="type" defaultValue={type} aria-label="Type">
          <option value="service">Services</option>
          <option value="talent">Talents</option>
          <option value="projet">Projets</option>
          <option value="categorie">Catégories</option>
        </select>
        <select name="categorie" defaultValue={query.categorie ?? ""} aria-label="Catégorie">
          <option value="">Catégorie</option>
          {tree.map((group) => <option key={group.parent.id} value={group.parent.slug}>{group.parent.name}</option>)}
        </select>
        <input name="prixMax" inputMode="decimal" defaultValue={query.prixMax ?? ""} aria-label="Budget maximum" placeholder="Budget max" />
        <input name="delai" type="number" min={1} max={365} defaultValue={query.delai ?? ""} aria-label="Délai maximum en jours" placeholder="Délai max" />
        <button type="submit">Filtrer</button>
      </form>
      {(query.q || query.categorie || query.prixMax || query.delai) ? <Link href="/talents/recherche" className="text-sm font-semibold text-[#1557c0]">Effacer les filtres</Link> : null}
      {results.length === 0 ? <EmptyState title="Aucun résultat" text="Aucun contenu publié ne correspond à ces critères." /> : (
        <ul className="market-gigs">
          {results.map((item) => {
            if (isService(item)) return <li key={item.id}><ServiceCard service={item} /></li>;
            if (isTalent(item)) return <li key={item.userId}><TalentCard person={item} /></li>;
            if (isProject(item)) return <li key={item.id}><OpportunityCard item={item} /></li>;
            if (isCategory(item)) return <li key={item.id}><Link href={`/talents/categories/${item.slug}`} className="panel block p-4 font-semibold">{item.name}</Link></li>;
            return null;
          })}
        </ul>
      )}
    </div>
  );
}
