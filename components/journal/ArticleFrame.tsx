import type { ReactNode } from "react";
import Link from "next/link";
import { ArticleShare } from "@/components/blog/ArticleShare";
import { readingLabel } from "@/lib/format";
import type { JournalItem } from "@/lib/journal/items";

type Neighbor = { href: string; title: string } | null;

export function ArticleFrame({
  category,
  title,
  author,
  authorHref,
  date,
  dateLabel,
  minutes,
  shareUrl,
  cover,
  excerpt,
  children,
  previous,
  next,
  related,
}: {
  category: string;
  title: string;
  author: string;
  authorHref: string;
  date: string;
  dateLabel: string;
  minutes: number;
  shareUrl: string;
  cover?: string;
  excerpt?: string;
  children: ReactNode;
  previous: Neighbor;
  next: Neighbor;
  related: JournalItem[];
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <nav className="text-xs text-muted" aria-label="Fil d'Ariane">
        <Link href="/">Accueil</Link>
        <span aria-hidden="true"> › </span>
        <Link href="/articles">Articles</Link>
        <span aria-hidden="true"> › </span>
        <Link href={`/articles?rubrique=${encodeURIComponent(category)}`}>{category}</Link>
      </nav>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article>
          <Link href={`/articles?rubrique=${encodeURIComponent(category)}`} className="inline-block bg-ink px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
            {category}
          </Link>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{title}</h1>
          {excerpt ? <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">{excerpt}</p> : null}
          <p className="mt-4 text-sm text-muted">
            <Link href={authorHref} className="font-semibold text-ink">
              {author}
            </Link>
            {" · "}
            <time dateTime={date}>{dateLabel}</time>
            {" · "}
            {readingLabel(minutes)}
          </p>
          <div className="mt-4 border-y border-line py-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Partager</p>
            <ArticleShare title={title} url={shareUrl} />
          </div>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="mt-6 aspect-[16/9] w-full border border-line object-cover" />
          ) : null}
          <div className="mt-8">{children}</div>
          <div className="mt-8 border border-line bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Écrit par</p>
            <p className="mt-1 font-serif text-2xl">
              <Link href={authorHref}>{author}</Link>
            </p>
            <Link href={authorHref} className="mt-2 inline-block text-sm font-semibold text-accent">
              Voir la page de l&apos;auteur
            </Link>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Partager</p>
            <ArticleShare title={title} url={shareUrl} />
          </div>
          <nav className="mt-8 grid gap-3 border-t border-line pt-6 sm:grid-cols-2" aria-label="Articles voisins">
            {previous ? (
              <Link href={previous.href} className="border border-line bg-white p-4">
                <span className="text-xs text-muted">Article précédent</span>
                <span className="mt-2 block font-semibold">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={next.href} className="border border-line bg-white p-4 sm:text-right">
                <span className="text-xs text-muted">Article suivant</span>
                <span className="mt-2 block font-semibold">{next.title}</span>
              </Link>
            ) : null}
          </nav>
        </article>

        <aside className="lg:sticky lg:top-24">
          <h2 className="border-b-2 border-ink pb-2 text-sm font-bold uppercase tracking-wide">À lire aussi</h2>
          {related.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-muted">D&apos;autres articles de la communauté apparaîtront ici.</p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {related.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="grid grid-cols-[72px_1fr] gap-3 border border-line bg-white p-2">
                    {item.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.cover} alt="" className="h-16 w-full object-cover" />
                    ) : (
                      <span className="flex h-16 items-end bg-[linear-gradient(160deg,#e8f1ff,#f7fbff)] p-1 text-sm font-bold text-accent" aria-hidden="true">
                        {item.category.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0 py-1 pr-1">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-accent">{item.category}</span>
                      <span className="mt-1 block text-sm font-bold leading-5">{item.title}</span>
                      <span className="mt-1 block text-[11px] text-muted">{item.dateLabel}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/articles" className="mt-4 inline-block text-sm font-semibold text-accent">
            Retour au journal
          </Link>
        </aside>
      </div>
    </div>
  );
}
