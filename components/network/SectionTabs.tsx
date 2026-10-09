import Link from "next/link";

export function SectionTabs({
  items,
  active,
  hrefFor,
  label,
}: {
  items: readonly (readonly [string, string])[];
  active: string;
  hrefFor: (id: string) => string;
  label: string;
}) {
  return (
    <div className="section-tabs" role="tablist" aria-label={label}>
      {items.map(([id, title]) => (
        <Link key={id} href={hrefFor(id)} className="section-tab" aria-current={active === id ? "page" : undefined}>
          {title}
        </Link>
      ))}
    </div>
  );
}
