"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/studio", label: "Vue d'ensemble" },
  { href: "/admin/studio/profils", label: "Profils" },
  { href: "/admin/studio/nouveau", label: "Nouvelle publication" },
  { href: "/admin/studio/generer", label: "Génération IA" },
  { href: "/admin/studio/brouillons", label: "Brouillons" },
  { href: "/admin/studio/programmes", label: "Programmées" },
  { href: "/admin/studio/calendrier", label: "Calendrier" },
  { href: "/admin/studio/bibliotheque", label: "Bibliothèque" },
  { href: "/admin/studio/historique", label: "Historique" },
];

export function StudioNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto pb-2" aria-label="Studio de contenu">
      {links.map((link) => {
        const active = link.href === "/admin/studio" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className={`shrink-0 border px-3 py-2 text-sm font-semibold ${active ? "border-accent text-accent" : "border-line text-muted"}`}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
