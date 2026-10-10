"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { id: string; slug: string; name: string };
type Group = { parent: Item; children: Item[] };

function columnsOf(items: Item[]) {
  const count = 4;
  const size = Math.max(1, Math.ceil(items.length / count));
  return Array.from({ length: count }, (_, index) => items.slice(index * size, (index + 1) * size)).filter((column) => column.length > 0);
}

export function MegaMenu({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const current = groups.find((group) => group.parent.id === open);
  return (
    <div className="relative" onMouseLeave={() => setOpen(null)}>
      <div className="market-cats" role="navigation" aria-label="Catégories de services">
        {groups.map((group) => (
          <button
            key={group.parent.id}
            type="button"
            className="market-cat"
            aria-expanded={open === group.parent.id}
            onMouseEnter={() => setOpen(group.parent.id)}
            onFocus={() => setOpen(group.parent.id)}
            onClick={() => setOpen(open === group.parent.id ? null : group.parent.id)}
          >
            {group.parent.name}
          </button>
        ))}
      </div>
      {current ? (
        <div className="market-drop">
          <div className="market-drop-grid max-lg:hidden">
            {columnsOf(current.children).map((column) => (
              <ul key={column[0]?.id}>
                {column.map((child, index) => (
                  <li key={child.id}>
                    <Link href={`/talents/categories/${child.slug}`} className={index === 0 ? "is-title" : undefined}>{child.name}</Link>
                  </li>
                ))}
              </ul>
            ))}
            <Link href={`/talents/categories/${current.parent.slug}`} className="is-title">Toute la catégorie</Link>
          </div>
          <ul className="market-mobile-panel market-wrap lg:hidden">
            <li><Link href={`/talents/categories/${current.parent.slug}`} className="is-title">Toute la catégorie</Link></li>
            {current.children.map((child) => (
              <li key={child.id}><Link href={`/talents/categories/${child.slug}`}>{child.name}</Link></li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
