import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, OpportunityCard, ServiceCard, TalentCard } from "@/components/talents/Cards";
import { categoryTree, loadCategories, searchMarket, type TalentCategory, type TalentOpportunity, type TalentPerson, type TalentService } from "@/lib/talents/queries";

export const dynamic = "force-dynamic";

function isService(item: TalentService | TalentPerson | TalentOpportunity | TalentCategory): item is TalentService {
  return "offerKind" in item;
}
function isProject(item: TalentService | TalentPerson | TalentOpportunity | TalentCategory): item is TalentOpportunity {
  return "missionType" in item;
}
function isTalent(item: TalentService | TalentPerson | TalentOpportunity | TalentCategory): item is TalentPerson {
  return "username" in item && !("offerKind" in item) && !("missionType" in item);
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await loadCategories();
  const current = categories.find((item) => item.slug === slug && item.active);
  if (!current) notFound();
  const parent = categories.find((item) => item.id === current.parentId);
  const children = categoryTree(categories).find((group) => group.parent.id === current.id)?.children
    ?? categories.filter((item) => item.parentId === current.id && item.active);
  const [services, projects, talents] = await Promise.all([
    searchMarket("service", "", slug),
    searchMarket("projet", "", slug),
    current.parentId ? Promise.resolve([]) : searchMarket("talent", current.name),
  ]);
  const serviceRows = services.filter(isService);
  const projectRows = projects.filter(isProject);
  const talentRows = talents.filter(isTalent);
  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <p className="text-sm text-muted">
          <Link href="/talents">Talents & Services</Link>
          {parent ? <> · <Link href={`/talents/categories/${parent.slug}`}>{parent.name}</Link></> : null}
          {" · "}{current.name}
        </p>
        <h1 className="text-3xl font-bold">{current.name}</h1>
        {current.description ? <p className="max-w-2xl text-sm leading-6 text-muted">{current.description}</p> : null}
        <p className="text-sm">{serviceRows.length} service{serviceRows.length > 1 ? "s" : ""} dans cette catégorie.</p>
      </header>
      {children.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <li key={child.id}><Link href={`/talents/categories/${child.slug}`} className="panel block p-4 font-semibold">{child.name}</Link></li>
          ))}
        </ul>
      ) : null}
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Services</h2>
        {serviceRows.length === 0 ? <EmptyState title="Aucun service dans cette catégorie" text="Les offres publiées par les membres apparaîtront ici." /> : (
          <ul className="grid gap-3 sm:grid-cols-2">{serviceRows.map((service) => <li key={service.id}><ServiceCard service={service} /></li>)}</ul>
        )}
      </section>
      {projectRows.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-bold">Projets</h2>
          <ul className="grid gap-3 sm:grid-cols-2">{projectRows.map((item) => <li key={item.id}><OpportunityCard item={item} /></li>)}</ul>
        </section>
      ) : null}
      {talentRows.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-bold">Talents</h2>
          <ul className="grid gap-3 sm:grid-cols-2">{talentRows.map((person) => <li key={person.userId}><TalentCard person={person} /></li>)}</ul>
        </section>
      ) : null}
      <p className="text-xs text-muted">Les résultats suivent la date de publication. Aucun classement de popularité n'est calculé.</p>
    </div>
  );
}
