"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { joinCommunity, leaveGroup, leaveSchool, removeGroupMember } from "@/lib/actions/network";
import type { ProfileActivity as Activity } from "@/lib/network/feed";

export function ProfileActivity({ activity, mine, path }: { activity: Activity; mine: boolean; path: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const administered = activity.groups.filter((group) => group.role === "admin");
  const joined = activity.groups.filter((group) => group.role !== "admin");
  const empty = administered.length + joined.length + activity.schools.length + activity.communities.length === 0;

  function run(action: () => Promise<{ error?: string; auth?: boolean }>) {
    setError("");
    start(async () => {
      const result = await action();
      if (result.auth) router.push(`/connexion?next=${encodeURIComponent(path)}`);
      else if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      {mine ? <p className="text-sm leading-6 text-muted">C&apos;est ici que vous gérez les groupes que vous avez créés, vos établissements et vos communautés.</p> : null}
      {empty ? <p className="text-sm text-muted">{mine ? "Vous n'avez pas encore de groupe. Dans une communauté, créez-en un : il apparaîtra ici, avec ses membres." : "Aucune activité de groupe pour le moment."}</p> : null}

      {administered.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-base font-bold">Groupes administrés</h2>
          {administered.map((group) => (
            <article key={group.id} className="border border-line bg-white p-4">
              <h3 className="text-sm font-bold">{group.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {group.communityName} · {group.members} {group.members > 1 ? "membres" : "membre"}
                {group.status === "closed" ? " · fermé" : ""}
              </p>
              {group.warning ? <p className="mt-2 border border-line bg-[#fff1f4] p-3 text-sm">Avertissement : {group.warning}</p> : null}
              {group.communitySlug ? (
                <Link href={`/communautes/${group.communitySlug}`} className="mt-2 inline-block text-sm font-semibold">
                  Voir dans la communauté
                </Link>
              ) : null}
              {mine && group.people.length > 0 ? (
                <ul className="mt-3 grid gap-2">
                  {group.people.map((person) => (
                    <li key={person.id} className="flex items-center justify-between gap-3 text-sm">
                      <span>{person.name}</span>
                      <button type="button" className="font-semibold text-danger" disabled={pending} onClick={() => run(() => removeGroupMember(group.id, person.id, group.communitySlug))}>
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {mine && group.people.length === 0 && group.status === "open" ? <p className="mt-2 text-sm text-muted">Aucun autre membre pour le moment.</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {joined.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-base font-bold">Groupes rejoints</h2>
          {joined.map((group) => (
            <article key={group.id} className="border border-line bg-white p-4">
              <h3 className="text-sm font-bold">{group.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {group.communityName} · {group.members} {group.members > 1 ? "membres" : "membre"}
                {group.status === "closed" ? " · fermé" : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {group.communitySlug ? (
                  <Link href={`/communautes/${group.communitySlug}`} className="text-sm font-semibold">
                    Voir
                  </Link>
                ) : null}
                {mine && group.status === "open" ? (
                  <button type="button" className="text-sm font-semibold" disabled={pending} onClick={() => run(() => leaveGroup(group.id, group.communitySlug))}>
                    Quitter
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activity.schools.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-base font-bold">Établissements</h2>
          {activity.schools.map((school) => (
            <article key={school.id} className="border border-line bg-white p-4">
              <h3 className="text-sm font-bold">{school.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {school.communityName} · {school.role === "manager" ? "Gérant principal" : "Membre"}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href={`/communautes/${school.communitySlug}`} className="text-sm font-semibold">
                  Voir
                </Link>
                {mine && school.role !== "manager" ? (
                  <button type="button" className="text-sm font-semibold" disabled={pending} onClick={() => run(() => leaveSchool(school.id, school.communitySlug))}>
                    Quitter
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {activity.communities.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-base font-bold">Communautés</h2>
          {activity.communities.map((community) => (
            <article key={community.id} className="flex items-center justify-between gap-3 border border-line bg-white p-4">
              <Link href={`/communautes/${community.slug}`} className="text-sm font-bold">
                {community.name}
              </Link>
              {mine ? (
                <button type="button" className="text-sm font-semibold" disabled={pending} onClick={() => run(() => joinCommunity(community.id, false))}>
                  Quitter
                </button>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
