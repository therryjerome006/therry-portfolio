"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Newspaper, UserRound } from "lucide-react";
import { CreateMenu } from "@/components/network/CreateMenu";

const items = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/decouvrir", label: "Découvrir", icon: Compass },
  { href: "/articles", label: "Articles", icon: Newspaper },
  { href: "/profil", label: "Profil", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white lg:hidden" aria-label="Application">
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
        {items.slice(0, 2).map((item) => (
          <NavItem key={item.href} {...item} active={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)} />
        ))}
        <li className="grid place-items-center">
          <CreateMenu compact />
        </li>
        {items.slice(2).map((item) => (
          <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
        ))}
      </ul>
    </nav>
  );
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <li>
      <Link href={href} className={`grid place-items-center gap-1 py-2 text-[11px] font-semibold ${active ? "text-accent" : "text-muted"}`} aria-current={active ? "page" : undefined}>
        <Icon size={18} />
        {label}
      </Link>
    </li>
  );
}
