"use client";

import { useMemo, useState } from "react";
import { estimateOffer, indicativePrice } from "@/lib/talents/rules";

type Package = {
  id: string;
  title: string;
  description: string;
  priceMode: "indicatif" | "convenir";
  priceCents: number | null;
  currency: string;
  delayDays: number;
  revisions: number;
  includes: string;
};

type Addon = { id: string; title: string; priceCents: number; currency: string };

export function OfferPanel({ packages, addons }: { packages: Package[]; addons: Addon[] }) {
  const [selected, setSelected] = useState(packages[0]?.id ?? "");
  const [chosen, setChosen] = useState<string[]>([]);
  const current = packages.find((item) => item.id === selected) ?? packages[0];
  const estimate = useMemo(() => {
    if (!current) return null;
    return estimateOffer({
      packageCents: current.priceCents,
      packageMode: current.priceMode,
      currency: current.currency,
      addons: addons.map((item) => ({ cents: item.priceCents, currency: item.currency, selected: chosen.includes(item.id) })),
    });
  }, [addons, chosen, current]);
  if (!current) return null;
  return (
    <section className="grid gap-3 border border-line p-4" aria-label="Formules">
      <div className="flex flex-wrap gap-2">
        {packages.map((item) => (
          <button key={item.id} type="button" className={item.id === current.id ? "btn btn-primary" : "btn btn-line"} aria-pressed={item.id === current.id} onClick={() => setSelected(item.id)}>
            {item.title}
          </button>
        ))}
      </div>
      <p className="text-sm leading-6">{current.includes || current.description}</p>
      <p className="font-semibold">{indicativePrice(current.priceCents, current.priceMode, current.currency)}</p>
      <p className="text-sm">{current.delayDays} jours · {current.revisions} révision{current.revisions > 1 ? "s" : ""}</p>
      {addons.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Options</legend>
          {addons.map((item) => (
            <label key={item.id} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={chosen.includes(item.id)}
                onChange={() => setChosen((list) => list.includes(item.id) ? list.filter((id) => id !== item.id) : [...list, item.id])}
              />
              {item.title} · {indicativePrice(item.priceCents, "indicatif", item.currency)}
            </label>
          ))}
        </fieldset>
      ) : null}
      {estimate?.error ? <p className="text-sm text-[#9f1239]">{estimate.error}</p> : <p className="text-sm font-semibold">Montant estimé : {estimate?.label}. Ce n'est pas une transaction.</p>}
    </section>
  );
}
