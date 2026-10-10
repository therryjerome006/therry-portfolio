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
      <h1 className="text-3xl font-bold">Services</h1>
      <form action="/talents/services" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input name="q" defaultValue={query.q ?? ""} className="field" placeholder="Titre ou description" aria-label="Recherche" />
        <select name="categorie" defaultValue={query.categorie ?? ""} className="field" aria-label="Catégorie"><option value="">Toutes</option>{categories.filter((item) => item.active).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
        <select name="type" defaultValue={query.type ?? ""} className="field" aria-label="Type"><option value="">Tous les types</option>{offerKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <input name="prixMin" defaultValue={query.prixMin ?? ""} className="field" placeholder="Prix min" aria-label="Prix minimum" />
        <input name="prixMax" defaultValue={query.prixMax ?? ""} className="field" placeholder="Prix max" aria-label="Prix maximum" />
        <button className="btn btn-primary" type="submit">Filtrer</button>
        <a className="btn btn-line" href="/talents/services">Réinitialiser</a>
      </form>
      {services.length === 0 ? <EmptyState title="Aucun service" text="Aucune offre publiée ne correspond. Les prix affichés plus tard seront indicatifs." /> : (
        <ul className="grid gap-3 sm:grid-cols-2">{services.map((service) => <li key={service.id}><ServiceCard service={service} /></li>)}</ul>
      )}
    </>
  );
}
