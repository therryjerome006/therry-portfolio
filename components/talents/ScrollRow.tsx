"use client";

import { useRef, type ReactNode } from "react";

export function ScrollRow({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollBy({ left: direction * 280, behavior: reduced ? "auto" : "smooth" });
  }
  return (
    <div className="market-scroll">
      <button type="button" className="market-scroll-btn prev" aria-label="Faire défiler vers les catégories précédentes" onClick={() => move(-1)}>‹</button>
      <div ref={ref} className="market-row">{children}</div>
      <button type="button" className="market-scroll-btn next" aria-label="Faire défiler vers les catégories suivantes" onClick={() => move(1)}>›</button>
    </div>
  );
}
