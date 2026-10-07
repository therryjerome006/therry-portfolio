"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImageIcon, Newspaper, Plus, Video, X } from "lucide-react";

const items = [
  { href: "/publier?type=text", label: "Twit", icon: Plus },
  { href: "/publier?type=photo", label: "Photo", icon: ImageIcon },
  { href: "/publier?type=video", label: "Vidéo", icon: Video },
  { href: "/articles/ecrire", label: "Article", icon: Newspaper },
];

export function CreateMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className={compact ? "grid h-12 w-12 place-items-center bg-accent text-white" : "grid h-10 w-10 place-items-center bg-accent text-white"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Fermer la création" : "Créer"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={18} /> : <Plus size={18} />}
      </button>
      {open ? (
        <div className={`absolute z-50 w-44 border border-line bg-white p-2 shadow-lg ${compact ? "bottom-14 left-1/2 -translate-x-1/2" : "right-0 mt-2"}`} role="menu">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-muted">Créer</p>
          {items.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-ink hover:bg-[#f4f8ff]" onClick={() => setOpen(false)}>
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
