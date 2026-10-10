import Link from "next/link";

const links = [
  ["/talents/moi", "Profil"],
  ["/talents/moi/services", "Mes services"],
  ["/talents/moi/portfolio/nouveau", "Portfolio"],
  ["/talents/moi/candidatures", "Candidatures"],
  ["/talents/moi/projets", "Missions"],
  ["/talents/moi/reglages", "Paramètres"],
  ["/talents/aide", "Aide"],
] as const;

export function TalentNav({ signedIn, path }: { signedIn: boolean; path: string }) {
  void signedIn;
  return (
    <nav className="market-subnav" aria-label="Mon espace">
      {links.map(([href, label]) => (
        <Link key={`${href}-${label}`} href={href} aria-current={path === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
