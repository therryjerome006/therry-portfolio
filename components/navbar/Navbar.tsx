"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AccountLink } from "@/components/social/AccountLink";
import { navItems } from "@/data/navigation";
import { profile } from "@/data/profile";

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
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/#accueil" className="flex items-center gap-3 text-ink" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center border border-accent font-mono text-xs">TJ</span>
          <span className="hidden text-sm font-medium tracking-wide sm:inline">{profile.name}</span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Principale">
          {navItems.map((item) => {
            const active = item.href.startsWith("/") && !item.href.startsWith("/#") && (pathname === item.href || pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm ${active ? "text-ink" : "text-muted hover:text-ink"}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <AccountLink />
          {profile.cvUrl ? (
            <Link href={profile.cvUrl} className="btn btn-line hidden h-10 min-h-0 px-3 sm:inline-flex">
              CV
            </Link>
          ) : null}
          <button
            type="button"
            className="grid h-10 w-10 place-items-center border border-line lg:hidden"
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
        <nav id="mobile-nav" className="border-t border-line bg-bg lg:hidden" aria-label="Mobile">
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-4 sm:px-6">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block border-b border-line py-3 text-lg"
                  onClick={closeAfterNavigation}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {profile.cvUrl ? (
              <li>
                <Link
                  href={profile.cvUrl}
                  className="block py-3 text-lg"
                  onClick={closeAfterNavigation}
                >
                  CV
                </Link>
              </li>
            ) : null}
            <li onClick={closeAfterNavigation}>
              <AccountLink className="block py-3 text-lg" />
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
