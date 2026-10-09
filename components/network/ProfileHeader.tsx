import type { ReactNode } from "react";

export function ProfileHeader({
  name,
  handle,
  avatarUrl,
  bio,
  extra,
  website,
  badge,
  note,
  stats,
  actions,
}: {
  name: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  extra?: string;
  website?: string;
  badge?: string;
  note?: string;
  stats: { value: number; label: string }[];
  actions?: ReactNode;
}) {
  return (
    <header className="profile-sheet">
      <div className="flex items-center gap-4">
        <span className="grid h-20 w-20 shrink-0 place-items-center bg-gradient-to-br from-[#1d6fe8] to-[#8b7cff] text-3xl font-bold text-white shadow-[0_0_0_4px_var(--surface),0_0_0_6px_#7eb6ff]">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-20 w-20 object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{name}</h1>
          <p className="truncate text-sm text-muted">@{handle}</p>
          {badge ? <p className="mt-1 text-xs font-bold uppercase tracking-wide text-accent">{badge}</p> : null}
        </div>
      </div>
      {bio ? <p className="mt-4 whitespace-pre-wrap text-[15px] leading-6">{bio}</p> : null}
      {extra ? <p className="mt-2 text-sm text-muted">{extra}</p> : null}
      {website ? (
        <a href={website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-accent">
          {website.replace(/^https:\/\//, "")}
        </a>
      ) : null}
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
      <div className="profile-stats mt-4">
        {stats.map((stat) => (
          <span key={stat.label}>
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
          </span>
        ))}
      </div>
      {actions ? <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}
