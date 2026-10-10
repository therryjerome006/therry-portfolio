import Link from "next/link";
import { indicativePrice } from "@/lib/talents/rules";
import { availabilityLabels } from "@/lib/talents/copy";
import type { TalentOpportunity, TalentPerson, TalentService } from "@/lib/talents/queries";

export function EmptyState({ title, text, href, action }: { title: string; text: string; href?: string; action?: string }) {
  return (
    <div className="market-empty">
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
        {href && action ? <Link href={href} className="market-go mt-3 inline-flex items-center">{action}</Link> : null}
      </div>
    </div>
  );
}

function hue(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
}

function startingPrice(cents: number | null, mode: string, currency: string) {
  if (mode !== "indicatif" || cents == null) return { prefix: "Prix", amount: "Sur devis" };
  const grouped = String(Math.trunc(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return { prefix: "À partir de", amount: `${grouped} ${currency}` };
}

export function TalentCard({ person }: { person: TalentPerson }) {
  return (
    <Link href={`/talents/profil/${person.username}`} className="gig">
      <span className="gig-cover">
        <span className="gig-fallback" style={{ background: `hsl(${hue(person.username)} 42% 32%)` }}>{person.name}</span>
      </span>
      <span className="gig-seller">
        <span className="gig-avatar">
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatarUrl} alt="" />
          ) : person.name.slice(0, 1)}
        </span>
        {person.name}
      </span>
      <span className="gig-title">{person.title || `@${person.username}`}</span>
      {person.availability ? <span className="market-muted">{availabilityLabels[person.availability]}</span> : null}
    </Link>
  );
}

export function ServiceCard({ service }: { service: TalentService }) {
  const price = startingPrice(service.priceCents, service.priceMode, service.currency);
  return (
    <article className="gig">
      <Link href={`/talents/services/${service.id}`} className="gig-cover">
        {service.coverId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/talents/fichier?id=${service.coverId}&type=service`} alt="" />
        ) : (
          <span className="gig-fallback" style={{ background: `hsl(${hue(service.category || service.title)} 46% 36%)` }}>{service.category || service.title}</span>
        )}
      </Link>
      <Link href={`/talents/profil/${service.username}`} className="gig-seller">
        <span className="gig-avatar">
          {service.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.avatarUrl} alt="" />
          ) : (service.name || "?").slice(0, 1)}
        </span>
        {service.name || "Membre"}
      </Link>
      <Link href={`/talents/services/${service.id}`} className="gig-title">{service.title}</Link>
      <p className="gig-price"><small>{price.prefix}</small><strong>{price.amount}</strong></p>
    </article>
  );
}

export function OpportunityCard({ item }: { item: TalentOpportunity }) {
  const price = startingPrice(item.budgetCents, item.budgetMode === "discuter" ? "convenir" : "indicatif", item.currency);
  return (
    <article className="gig">
      <Link href={`/talents/opportunites/${item.id}`} className="gig-cover">
        <span className="gig-fallback" style={{ background: `hsl(${hue(item.category || item.title)} 38% 28%)` }}>{item.category || "Projet"}</span>
      </Link>
      <p className="gig-seller">{item.name || "Client"}</p>
      <Link href={`/talents/opportunites/${item.id}`} className="gig-title">{item.title}</Link>
      <p className="gig-price"><small>{price.prefix}</small><strong>{price.amount}</strong></p>
    </article>
  );
}

export function PortfolioCard({ item }: { item: { id: string; title: string; description: string; origin: string; status?: string } }) {
  return (
    <Link href={`/talents/portfolio/${item.id}`} className="gig">
      <span className="gig-cover"><span className="gig-fallback" style={{ background: "#243045" }}>{item.title}</span></span>
      <span className="gig-title">{item.title}</span>
      <span className="market-muted">{item.description}</span>
      {item.origin === "exercice" ? <span className="market-muted">Exercice fictif, pas une commande réelle.</span> : null}
    </Link>
  );
}

export function priceLine(cents: number | null, mode: "indicatif" | "convenir" | "discuter", currency: string) {
  return indicativePrice(cents, mode, currency);
}
