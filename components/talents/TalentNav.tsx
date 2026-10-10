import Link from "next/link";

const publicLinks = [
  ["/talents", "Découvrir"],
  ["/talents/services", "Services"],
  ["/talents/decouvrir", "Talents"],
  ["/talents/opportunites", "Projets"],
  ["/talents/categories", "Catégories"],
  ["/talents/aide", "Aide"],
] as const;

const privateLinks = [
  ["/talents/favoris", "Favoris"],
  ["/talents/moi/projets", "Messages"],
  ["/talents/moi", "Mon espace"],
] as const;

export function TalentNav({ signedIn, path }: { signedIn: boolean; path: string }) {
  const links = signedIn ? [...publicLinks, ...privateLinks] : publicLinks;
  return (
    <nav className="section-tabs" aria-label="Talents">
      {links.map(([href, label]) => (
        <Link key={`${href}-${label}`} href={href} className="section-tab" aria-current={path === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
