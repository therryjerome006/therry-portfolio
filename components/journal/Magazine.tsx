import Link from "next/link";
import { readingLabel } from "@/lib/format";
import { articleCategories } from "@/lib/network/constants";
import type { JournalItem } from "@/lib/journal/items";

function Cover({ item, className }: { item: JournalItem; className: string }) {
  if (!item.cover) {
    return (
      <div className={`${className} cover-wash flex items-end bg-[linear-gradient(160deg,#e8f1ff,#f7fbff)] p-4`} aria-hidden="true">
        <span className="text-3xl font-bold text-accent">{item.category.slice(0, 1)}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.cover} alt="" className={`${className} object-cover`} />
  );
}

function StoryMeta({ item }: { item: JournalItem }) {
  return (
    <p className="mt-2 text-xs text-muted">
      <Link href={item.authorHref} className="font-semibold text-ink">
        {item.author}
      </Link>
      {" · "}
      <time dateTime={item.date}>{item.dateLabel}</time>
      {" · "}
      {readingLabel(item.minutes)}
    </p>
  );
}

export function Magazine({ items, rubrique }: { items: JournalItem[]; rubrique?: string }) {
  const active = rubrique && items.some((item) => item.category === rubrique) ? rubrique : "";
  const visible = active ? items.filter((item) => item.category === active) : items;
  const lead = visible[0];
  const side = visible.slice(1, 4);
  const rest = visible.slice(4);
  const known = new Set<string>(articleCategories);
  const rubrics = [...new Set(items.map((item) => item.category))].sort((a, b) => {
    const ai = known.has(a) ? articleCategories.indexOf(a as (typeof articleCategories)[number]) : 99;
    const bi = known.has(b) ? articleCategories.indexOf(b as (typeof articleCategories)[number]) : 99;
    return ai - bi || a.localeCompare(b, "fr");
  });
  const sections = active
    ? []
    : rubrics
        .map((category) => ({
          category,
          items: items.filter((item) => item.category === category && item.href !== lead?.href).slice(0, 4),
        }))
        .filter((section) => section.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Journal</p>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
        </div>
        <Link href="/articles/ecrire" className="btn btn-primary h-10 min-h-0 px-3">
          Écrire
        </Link>
      </div>

      <nav className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Rubriques">
        <Link href="/articles" className={`chip shrink-0 ${active ? "" : "border-accent text-accent"}`}>
          Toutes
        </Link>
        {rubrics.map((category) => (
          <Link
            key={category}
            href={`/articles?rubrique=${encodeURIComponent(category)}`}
            className={`chip shrink-0 ${active === category ? "border-accent text-accent" : ""}`}
          >
            {category}
          </Link>
        ))}
      </nav>

      {!lead ? (
        <p className="mt-8 border border-line bg-white p-6 text-sm leading-6 text-muted">
          Aucun article publié pour le moment. Le premier texte de la communauté apparaîtra ici, à côté des articles du
          développeur.
        </p>
      ) : (
        <>
          <section className="mt-5" aria-label="À la une">
            <div className="flex items-center gap-3 border-b-2 border-ink pb-2">
              <span className="bg-ink px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">À la une</span>
              <Link href={lead.href} className="line-clamp-1 text-sm font-semibold">
                {lead.title}
              </Link>
            </div>
            <div className={`mt-4 grid gap-4 ${side.length > 0 ? "lg:grid-cols-[1.5fr_0.9fr]" : ""}`}>
              <article className="border border-line bg-white">
                <Link href={lead.href} className="block overflow-hidden">
                  <Cover item={lead} className="aspect-[16/9] w-full" />
                </Link>
                <div className="p-5">
                  <Link href={`/articles?rubrique=${encodeURIComponent(lead.category)}`} className="text-xs font-bold uppercase tracking-wide text-accent">
                    {lead.category}
                  </Link>
                  <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
                    <Link href={lead.href}>{lead.title}</Link>
                  </h2>
                  {lead.excerpt ? <p className="mt-3 max-w-3xl text-base leading-7 text-muted">{lead.excerpt}</p> : null}
                  <StoryMeta item={lead} />
                </div>
              </article>
              {side.length > 0 ? (
                <ul className="grid content-start gap-3">
                  {side.map((item) => (
                    <li key={item.href}>
                      <article className="grid grid-cols-[112px_1fr] gap-3 border border-line bg-white p-2">
                        <Link href={item.href} className="block overflow-hidden">
                          <Cover item={item} className="h-24 w-full" />
                        </Link>
                        <div className="min-w-0 py-1 pr-2">
                          <Link href={`/articles?rubrique=${encodeURIComponent(item.category)}`} className="text-[11px] font-bold uppercase tracking-wide text-accent">
                            {item.category}
                          </Link>
                          <h3 className="mt-1 line-clamp-3 text-sm font-bold leading-5">
                            <Link href={item.href}>{item.title}</Link>
                          </h3>
                          <p className="mt-1 text-[11px] text-muted">{item.dateLabel}</p>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          {active && rest.length > 0 ? (
            <section className="mt-10">
              <h2 className="border-b-2 border-ink pb-2 text-sm font-bold uppercase tracking-wide">{active}</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((item) => (
                  <StoryCard key={item.href} item={item} />
                ))}
              </ul>
            </section>
          ) : null}

          {sections.map((section) => (
            <section key={section.category} className="mt-10">
              <div className="flex items-end justify-between gap-3 border-b-2 border-ink pb-2">
                <h2 className="bg-ink px-2 py-1 text-sm font-bold uppercase tracking-wide text-white">{section.category}</h2>
                <Link href={`/articles?rubrique=${encodeURIComponent(section.category)}`} className="text-xs font-semibold text-accent">
                  Voir la rubrique
                </Link>
              </div>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {section.items.map((item) => (
                  <StoryCard key={item.href} item={item} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function StoryCard({ item }: { item: JournalItem }) {
  return (
    <li>
      <article className="flex h-full flex-col border border-line bg-white">
        <Link href={item.href} className="block overflow-hidden">
          <Cover item={item} className="aspect-[16/10] w-full" />
        </Link>
        <div className="flex flex-1 flex-col p-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-accent">{item.category}</span>
          <h3 className="mt-1 text-base font-bold leading-snug">
            <Link href={item.href}>{item.title}</Link>
          </h3>
          <StoryMeta item={item} />
        </div>
      </article>
    </li>
  );
}
