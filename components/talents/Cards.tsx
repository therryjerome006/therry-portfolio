import Link from "next/link";
import { indicativePrice } from "@/lib/talents/rules";
import { availabilityLabels } from "@/lib/talents/copy";
import type { TalentOpportunity, TalentPerson, TalentService } from "@/lib/talents/queries";

export function EmptyState({ title, text, href, action }: { title: string; text: string; href?: string; action?: string }) {
  return (
    <div className="panel p-4">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
      {href && action ? <Link href={href} className="btn btn-line mt-3">{action}</Link> : null}
    </div>
  );
}

export function TalentCard({ person }: { person: TalentPerson }) {
  return (
    <Link href={`/talents/profil/${person.username}`} className="panel flex h-full gap-3 p-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center bg-gradient-to-br from-[#1d6fe8] to-[#8b7cff] font-bold text-white">
        {person.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatarUrl} alt="" className="h-12 w-12 object-cover" />
        ) : person.name.slice(0, 1)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-bold">{person.name}</span>
        <span className="block truncate text-sm text-muted">@{person.username}</span>
        {person.title ? <span className="mt-1 block text-sm">{person.title}</span> : null}
        <span className="mt-2 flex flex-wrap gap-1">
          {person.categories.slice(0, 3).map((category) => <span key={category.slug} className="bg-[#e7f1ff] px-2 py-1 text-xs font-semibold text-[#1557c0]">{category.name}</span>)}
        </span>
        {person.availability ? <span className="mt-2 block text-xs text-muted">{availabilityLabels[person.availability]}</span> : null}
      </span>
    </Link>
  );
}

export function ServiceCard({ service }: { service: TalentService }) {
  return (
    <Link href={`/talents/services/${service.id}`} className="panel block h-full overflow-hidden">
      {service.coverId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/talents/fichier?id=${service.coverId}&type=service`} alt="" className="h-36 w-full object-cover" />
      ) : <span className="block h-2 bg-gradient-to-r from-[#1d6fe8] to-[#8b7cff]" />}
      <span className="block p-4">
        <span className="text-xs font-bold uppercase tracking-wide text-[#5b3fd4]">{service.category}</span>
        <span className="mt-1 block font-bold">{service.title}</span>
        <span className="mt-2 line-clamp-3 block text-sm leading-6 text-muted">{service.description}</span>
        <span className="mt-3 block text-sm font-semibold">{indicativePrice(service.priceCents, service.priceMode, service.currency)}</span>
        <span className="mt-1 block text-xs text-muted">{service.delayDays} jours · {service.name}</span>
      </span>
    </Link>
  );
}

export function OpportunityCard({ item }: { item: TalentOpportunity }) {
  return (
    <Link href={`/talents/opportunites/${item.id}`} className="panel block h-full p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#0d7494]">{item.category}</p>
      <h3 className="mt-1 font-bold">{item.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.description}</p>
      <p className="mt-3 text-sm font-semibold">{indicativePrice(item.budgetCents, item.budgetMode === "discuter" ? "discuter" : "indicatif", item.currency)}</p>
      <p className="mt-1 text-xs text-muted">{item.seats} place{item.seats > 1 ? "s" : ""} · {item.name}</p>
    </Link>
  );
}

export function PortfolioCard({ item }: { item: { id: string; title: string; description: string; origin: string; status?: string } }) {
  return (
    <Link href={`/talents/portfolio/${item.id}`} className="panel block h-full p-4">
      <h3 className="font-bold">{item.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.description}</p>
      {item.origin === "exercice" ? <p className="mt-2 text-xs font-semibold text-[#9f1239]">Exercice fictif, pas une commande réelle.</p> : null}
      {item.status && item.status !== "published" ? <p className="mt-2 text-xs text-muted">{item.status === "draft" ? "Brouillon" : "Archivé"}</p> : null}
    </Link>
  );
}
