"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { id: string; slug: string; name: string; description: string };
type Group = { parent: Item; children: Item[] };

export function MegaMenu({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <nav aria-label="Catégories de services" className="border border-line bg-white">
      <ul className="hidden gap-1 p-2 lg:flex lg:flex-wrap">
        {groups.map((group) => (
          <li key={group.parent.id} className="relative" onMouseLeave={() => setOpen(null)}>
            <button
              type="button"
              className="px-3 py-2 text-sm font-semibold text-[#12263f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1d6fe8]"
              aria-expanded={open === group.parent.id}
              onMouseEnter={() => setOpen(group.parent.id)}
              onFocus={() => setOpen(group.parent.id)}
              onClick={() => setOpen(open === group.parent.id ? null : group.parent.id)}
            >
              {group.parent.name}
            </button>
            {open === group.parent.id ? (
              <div className="absolute left-0 z-20 mt-1 max-h-[70vh] w-[min(42rem,80vw)] overflow-auto border border-line bg-white p-4 shadow-lg">
                <Link href={`/talents/categories/${group.parent.slug}`} className="text-sm font-bold text-[#1557c0]">{group.parent.name}</Link>
                <ul className="mt-3 columns-2 gap-6">
                  {group.children.map((child) => (
                    <li key={child.id} className="mb-2 break-inside-avoid">
                      <Link href={`/talents/categories/${child.slug}`} className="text-sm hover:text-[#1557c0]">{child.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="grid lg:hidden">
        {groups.map((group) => (
          <details key={group.parent.id} className="border-t border-line">
            <summary className="cursor-pointer px-3 py-3 text-sm font-semibold">{group.parent.name}</summary>
            <ul className="grid gap-2 px-4 pb-3">
              <li><Link href={`/talents/categories/${group.parent.slug}`} className="text-sm font-semibold text-[#1557c0]">Toute la catégorie</Link></li>
              {group.children.map((child) => (
                <li key={child.id}><Link href={`/talents/categories/${child.slug}`} className="text-sm">{child.name}</Link></li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </nav>
  );
}
