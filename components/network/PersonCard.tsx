import Link from "next/link";
import type { ReactNode } from "react";

export function PersonCard({
  href,
  name,
  username,
  avatarUrl,
  bio,
  badge,
  action,
}: {
  href: string;
  name: string;
  username: string;
  avatarUrl: string;
  bio: string;
  badge?: string;
  action?: ReactNode;
}) {
  return (
    <article className="panel flex gap-3 p-4">
      <Link href={href} className="grid h-14 w-14 shrink-0 place-items-center bg-[#e4edf8] text-lg font-bold text-ink">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-14 w-14 object-cover" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="block min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-ink">{name}</span>
            {badge ? <span className="border border-accent px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-accent">{badge}</span> : null}
          </span>
          <span className="mt-0.5 block text-xs text-muted">@{username}</span>
          {bio ? <span className="mt-2 block text-sm leading-6 text-ink">{bio}</span> : null}
        </Link>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </article>
  );
}
