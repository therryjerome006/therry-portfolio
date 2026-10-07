"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addSchool, joinSchool, leaveSchool } from "@/lib/actions/network";
import type { CommunityGroup } from "@/lib/network/feed";

export function SchoolGroup({
  group,
  slug,
  signedIn,
  canJoin,
}: {
  group: CommunityGroup;
  slug: string;
  signedIn: boolean;
  canJoin: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run(action: () => Promise<{ error?: string; auth?: boolean }>) {
    setError("");
    start(async () => {
      const result = await action();
      if (result.auth) router.push(`/connexion?next=${encodeURIComponent(`/communautes/${slug}`)}`);
      else if (result.error) setError(result.error);
      else {
        setName("");
        router.refresh();
      }
    });
  }

  return (
    <section className="border border-line bg-white p-4">
      <h3 className="text-sm font-bold">{group.name}</h3>
      {group.mine ? <p className="mt-2 text-sm">Vous êtes à {group.mine.name}.</p> : null}
      {group.schools.length === 0 ? <p className="mt-2 text-sm text-muted">Aucune école pour le moment.</p> : null}
      <ul className="mt-3 grid gap-2">
        {group.schools.map((school) => (
          <li key={school.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {school.name}
              <span className="text-muted"> · {school.members} {school.members > 1 ? "membres" : "membre"}</span>
            </span>
            {canJoin && group.mine?.id === school.id ? (
              <button type="button" className="btn btn-line h-9 min-h-0 px-3" disabled={pending} onClick={() => run(() => leaveSchool(school.id, slug))}>
                Quitter
              </button>
            ) : null}
            {canJoin && group.mine?.id !== school.id ? (
              <button type="button" className="btn btn-primary h-9 min-h-0 px-3" disabled={pending} onClick={() => run(() => joinSchool(school.id, slug))}>
                Rejoindre
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {canJoin ? (
        <form
          className="mt-4 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => addSchool(group.id, name, slug));
          }}
        >
          <label className="grid gap-2 text-sm font-semibold">
            Ajouter mon école
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="field" placeholder="Nom de l'école" />
          </label>
          <button type="submit" className="btn btn-line h-10 w-fit min-h-0 px-3" disabled={pending || name.trim().length < 2}>
            Ajouter et rejoindre
          </button>
        </form>
      ) : null}
      {!signedIn ? (
        <p className="mt-3 text-sm">
          <Link href={`/connexion?next=${encodeURIComponent(`/communautes/${slug}`)}`} className="font-semibold">
            Connectez-vous
          </Link>{" "}
          pour rejoindre une école.
        </p>
      ) : null}
      {signedIn && !canJoin ? <p className="mt-3 text-sm text-muted">Les groupes d&apos;écoles sont réservés aux 12 à 22 ans.</p> : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
