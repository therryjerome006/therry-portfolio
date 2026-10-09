import Link from "next/link";

export function ArticleCard({
  id,
  title,
  excerpt,
  cover,
  category,
}: {
  id: string;
  title: string;
  excerpt: string;
  cover: string;
  category: string;
}) {
  return (
    <Link href={`/articles/${id}`} className="panel block overflow-hidden">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="aspect-video w-full object-cover" />
      ) : null}
      <span className="block p-4">
        {category ? <span className="text-xs font-bold uppercase tracking-wide text-accent">{category}</span> : null}
        <span className="mt-1 block text-lg font-bold text-ink">{title}</span>
        {excerpt ? <span className="mt-2 block text-sm leading-6 text-muted">{excerpt}</span> : null}
      </span>
    </Link>
  );
}
