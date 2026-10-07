"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReportButton } from "@/components/network/ReportButton";
import { createGroup, joinGroup, leaveGroup, removeGroupMember } from "@/lib/actions/network";
import type { MemberGroup } from "@/lib/network/feed";

export function MemberGroups({
  communityId,
  slug,
  signedIn,
  groups,
}: {
  communityId: string;
  slug: string;
  signedIn: boolean;
  groups: MemberGroup[];
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
    <div className="grid gap-3">
      {groups.length === 0 ? <p className="text-sm text-muted">Aucun groupe pour le moment.</p> : null}
      {groups.map((group) => (
        <section key={group.id} className="border border-line bg-white p-4">
          <h3 className="text-sm font-bold">{group.name}</h3>
          <p className="mt-1 text-sm text-muted">
            Administré par {group.ownerName} · {group.members} {group.members > 1 ? "membres" : "membre"}
          </p>
          {group.mine === "admin" ? <p className="mt-2 text-sm">Vous administrez ce groupe.</p> : null}
          {group.status === "closed" ? <p className="mt-2 text-sm">Fermé par l&apos;administration.</p> : null}
          {group.warning ? <p className="mt-2 border border-line bg-[#fff1f4] p-3 text-sm">Avertissement : {group.warning}</p> : null}
          {group.status === "open" && signedIn && group.mine !== "admin" ? (
            <div className="mt-3">
              {group.mine === "member" ? (
                <button type="button" className="btn btn-line h-9 min-h-0 px-3" disabled={pending} onClick={() => run(() => leaveGroup(group.id, slug))}>
                  Quitter
                </button>
              ) : (
                <button type="button" className="btn btn-primary h-9 min-h-0 px-3" disabled={pending} onClick={() => run(() => joinGroup(group.id, slug))}>
                  Rejoindre
                </button>
              )}
            </div>
          ) : null}
          {group.people.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {group.people.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{person.name}</span>
                  <button type="button" className="text-sm font-semibold text-danger" disabled={pending} onClick={() => run(() => removeGroupMember(group.id, person.id, slug))}>
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3">
            <ReportButton targetType="group" targetId={group.id} path={`/communautes/${slug}`} />
          </div>
        </section>
      ))}
      {signedIn ? (
        <form
          className="grid gap-2 border border-line bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => createGroup(communityId, name, slug));
          }}
        >
          <label className="grid gap-2 text-sm font-semibold">
            Créer un groupe
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} className="field" placeholder="Nom du groupe" />
          </label>
          <p className="text-sm text-muted">Vous en devenez l&apos;administrateur, sans demande d&apos;accord. L&apos;administration peut surveiller, avertir ou fermer le groupe.</p>
          <button type="submit" className="btn btn-line h-10 w-fit min-h-0 px-3" disabled={pending || name.trim().length < 2}>
            Créer
          </button>
        </form>
      ) : (
        <p className="text-sm">
          <Link href={`/connexion?next=${encodeURIComponent(`/communautes/${slug}`)}`} className="font-semibold">
            Connectez-vous
          </Link>{" "}
          pour créer ou rejoindre un groupe.
        </p>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
