"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ExternalLink, Menu, PenLine, SquarePen, X } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { profile } from "@/data/profile";

const links = [
  { href: "/admin/blog", label: "Articles", icon: SquarePen },
  { href: "/admin/blog/new", label: "Nouvel article", icon: PenLine },
  { href: "/admin/media", label: "Media", icon: SquarePen },
  { href: "/admin/realisations", label: "Réalisations", icon: SquarePen },
  { href: "/admin/communaute", label: "Communauté", icon: SquarePen },
  { href: "/admin/reseau", label: "Réseau", icon: SquarePen },
];

export function AdminHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function active(href: string) {
    if (href === "/admin/blog/new") return pathname === href;
    if (href === "/admin/media") return pathname.startsWith("/admin/media");
    if (href === "/admin/realisations") return pathname.startsWith("/admin/realisations");
    if (href === "/admin/communaute") return pathname.startsWith("/admin/communaute");
    if (href === "/admin/reseau") return pathname.startsWith("/admin/reseau");
    return pathname === "/admin/blog" || /^\/admin\/blog\/[^/]+\/edit$/.test(pathname);
  }

  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-[#1d6fe8] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/admin/blog" className="flex items-center gap-3 text-ink">
          <span className="grid h-9 w-9 place-items-center border border-accent font-mono text-xs font-bold">TJ</span>
          <span className="leading-tight">
            <span className="block text-sm font-bold">{profile.name}</span>
            <span className="block font-mono text-[0.65rem] font-bold tracking-[0.14em] text-accent uppercase">
              Administration
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Administration">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold ${active(link.href) ? "text-ink" : "text-muted hover:text-ink"}`}
              aria-current={active(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/" className="btn btn-line h-10 min-h-0 px-3">
            <ExternalLink size={15} aria-hidden="true" />
            Voir le site
          </Link>
          <form action={logout}>
            <button type="submit" className="btn btn-line h-10 min-h-0 px-3">
              Déconnexion
            </button>
          </form>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center border border-line md:hidden"
          aria-expanded={open}
          aria-controls="admin-nav"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <nav id="admin-nav" className="border-t border-line bg-white md:hidden" aria-label="Administration mobile">
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 sm:px-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block px-2 py-3 text-sm font-semibold ${active(link.href) ? "text-ink" : "text-muted"}`}
                  aria-current={active(link.href) ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/" className="block px-2 py-3 text-sm font-semibold text-muted">
                Voir le site
              </Link>
            </li>
            <li className="px-2 pt-2">
              <form action={logout}>
                <button type="submit" className="btn btn-line w-full">
                  Déconnexion
                </button>
              </form>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
