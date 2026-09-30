import Link from "next/link";
import { mediaFilters } from "@/lib/media/constants";

export function MediaFilters({ active, query }: { active: string; query: string }) {
  function href(id: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (id !== "all") params.set("filter", id);
    const value = params.toString();
    return value ? `/media?${value}` : "/media";
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="navigation" aria-label="Filtres du journal">
      {mediaFilters.map((filter) => {
        const selected = active === filter.id;
        return (
          <Link
            key={filter.id}
            href={href(filter.id)}
            aria-current={selected ? "page" : undefined}
            className={`shrink-0 border px-3 py-2 text-sm font-semibold ${selected ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
