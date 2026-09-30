import Link from "next/link";
import { blogCategories } from "@/data/blog";

type Query = { q?: string; category?: string; tag?: string };

function hrefFor(query: Query, patch: Partial<Query>) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.tag) params.set("tag", next.tag);
  const value = params.toString();
  return value ? `/blog?${value}` : "/blog";
}

export function BlogFilters({ query }: { query: Query }) {
  const categories = ["Tous", ...blogCategories];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="navigation" aria-label="Catégories du blog">
      {categories.map((category) => {
        const active = category === "Tous" ? !query.category : query.category === category;
        return (
          <Link
            key={category}
            href={hrefFor(query, { category: category === "Tous" ? undefined : category })}
            className={`shrink-0 border px-3 py-2 text-sm ${active ? "border-accent bg-accent text-white" : "border-line text-muted"}`}
            aria-current={active ? "page" : undefined}
          >
            {category}
          </Link>
        );
      })}
    </div>
  );
}

export function blogPageHref(page: number, query: Query) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.tag) params.set("tag", query.tag);
  if (page > 1) params.set("page", String(page));
  const value = params.toString();
  return value ? `/blog?${value}` : "/blog";
}
