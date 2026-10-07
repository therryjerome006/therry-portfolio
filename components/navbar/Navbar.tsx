"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Menu, Search, X } from "lucide-react";
import { CreateMenu } from "@/components/network/CreateMenu";
import { AccountLink } from "@/components/social/AccountLink";
import { developerNav, socialNav } from "@/data/navigation";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function closeAfterNavigation() {
    window.setTimeout(() => setOpen(false), 0);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-ink" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center bg-accent font-mono text-xs font-bold text-white">TY</span>
          <span className="text-sm font-bold tracking-wide">TY Space</span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex" aria-label="Principale">
          {socialNav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={`text-sm font-semibold ${active ? "text-ink" : "text-muted hover:text-ink"}`} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
          <Link href="/developpeur" className={`text-sm ${pathname.startsWith("/developpeur") ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}>
            Développeur
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/recherche" className="grid h-10 w-10 place-items-center text-ink" aria-label="Rechercher">
            <Search size={18} />
          </Link>
          <Link href="/notifications" className="grid h-10 w-10 place-items-center text-ink" aria-label="Notifications">
            <Bell size={18} />
          </Link>
          <div className="hidden sm:block">
            <CreateMenu />
          </div>
          <AccountLink className="hidden h-10 items-center px-2 text-sm font-semibold text-ink sm:inline-flex" />
          <button
            type="button"
            className="grid h-10 w-10 place-items-center border border-line md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-line bg-white md:hidden" aria-label="Mobile">
          <ul className="mx-auto flex max-w-5xl flex-col px-4 py-3">
            {socialNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-3 text-lg font-semibold" onClick={closeAfterNavigation}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-line pt-2 text-xs font-bold uppercase tracking-wide text-muted">Le développeur</li>
            {developerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-2 text-base" onClick={closeAfterNavigation}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
