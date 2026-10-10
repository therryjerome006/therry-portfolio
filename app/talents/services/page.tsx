import { EmptyState, ServiceCard } from "@/components/talents/Cards";
import { loadCategories, searchServices } from "@/lib/talents/queries";
import { offerKinds } from "@/lib/talents/rules";

export const dynamic = "force-dynamic";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const page = Number(query.page ?? 0) || 0;
  const [services, categories] = await Promise.all([
    searchServices({ q: query.q, categorie: query.categorie, type: query.type, prixMin: query.prixMin, prixMax: query.prixMax, page }),
    loadCategories(),
  ]);
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{query.q ? `Services pour « ${query.q} »` : "Services"}</h1>
      <p className="market-muted">{services.length} résultat{services.length > 1 ? "s" : ""} sur cette page.</p>
      <form action="/talents/services" className="market-filters">
        <input name="q" defaultValue={query.q ?? ""} placeholder="Recherche" aria-label="Recherche" />
        <select name="categorie" defaultValue={query.categorie ?? ""} aria-label="Catégorie"><option value="">Catégorie</option>{categories.filter((item) => item.active && !item.parentId).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
        <select name="type" defaultValue={query.type ?? ""} aria-label="Type"><option value="">Type de prestation</option>{offerKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <input name="prixMin" defaultValue={query.prixMin ?? ""} placeholder="Budget min" aria-label="Budget minimum" />
        <input name="prixMax" defaultValue={query.prixMax ?? ""} placeholder="Budget max" aria-label="Budget maximum" />
        <button type="submit">Filtrer</button>
        <a href="/talents/services">Effacer</a>
      </form>
      {services.length === 0 ? <EmptyState title="Aucun service" text="Aucune offre publiée ne correspond. Les prix affichés plus tard seront indicatifs." /> : (
        <ul className="market-gigs">{services.map((service) => <li key={service.id}><ServiceCard service={service} /></li>)}</ul>
      )}
    </>
  );
}
