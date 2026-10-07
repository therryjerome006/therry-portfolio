import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { moderateMemberGroup, reviewReport, reviewSchoolRequest, setSuspension } from "@/lib/actions/moderation";
import { dbPool } from "@/lib/media/db";
import { reportReasons } from "@/lib/network/constants";

export const dynamic = "force-dynamic";

const requestNotices: Record<string, string> = {
  creee: "Établissement créé. Le demandeur en est le gérant principal.",
  rejetee: "Demande refusée.",
  doublon: "Un établissement porte déjà ce nom. Aucun second groupe n'a été créé.",
  gerant: "Cette personne gère déjà un établissement dans cette communauté.",
  absente: "Cette demande n'est plus en attente.",
  erreur: "La décision n'a pas pu être enregistrée.",
};

const groupNotices: Record<string, string> = {
  ferme: "Groupe fermé. Son administrateur a été prévenu.",
  rouvert: "Groupe rouvert.",
  signale: "Groupe signalé. Il reste visible, sous surveillance.",
  retire: "Signalement retiré.",
  avertissement: "Avertissement envoyé à l'administrateur du groupe.",
  erreur: "L'action sur le groupe n'a pas pu être enregistrée.",
};

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  note: string;
  status: string;
  created_at: string;
  username: string;
};

type SchoolRequestRow = {
  id: string;
  name: string;
  note: string;
  created_at: string;
  username: string;
  display_name: string;
  community: string;
  duplicate: boolean;
};

type MemberGroupRow = {
  id: string;
  name: string;
  status: string;
  warning: string;
  flagged: boolean;
  community: string;
  slug: string;
  username: string | null;
  display_name: string | null;
  members: string;
};

export default async function AdminNetworkPage({ searchParams }: { searchParams: Promise<{ ecole?: string; groupe?: string }> }) {
  await requireAdmin();
  const { ecole, groupe } = await searchParams;
  const notice = (ecole ? requestNotices[ecole] : "") || (groupe ? groupNotices[groupe] : "");
  const db = dbPool();
  const reports = db
    ? await db.query<ReportRow>(
        `select r.id, r.target_type, r.target_id, r.reason, r.note, r.status, r.created_at, p.username
         from public.reports r
         join public.profiles p on p.id = r.reporter_id
         order by r.created_at desc
         limit 40`,
      )
    : { rows: [] };
  const counts = db
    ? await db.query<{ profiles: string; posts: string; reports: string }>(
        `select
           (select count(*) from public.profiles) as profiles,
           (select count(*) from public.posts) as posts,
           (select count(*) from public.reports where status = 'pending') as reports`,
      )
    : { rows: [{ profiles: "0", posts: "0", reports: "0" }] };
  const requests = db
    ? await db.query<SchoolRequestRow>(
        `select r.id, r.name, r.note, r.created_at, p.username, p.display_name, c.name as community,
                exists (
                  select 1 from public.schools s
                  where s.group_id = r.group_id and lower(s.name) = lower(r.name)
                ) as duplicate
         from public.school_requests r
         join public.profiles p on p.id = r.user_id
         join public.community_groups g on g.id = r.group_id
         join public.communities c on c.id = g.community_id
         where r.status = 'pending'
         order by r.created_at`,
      )
    : { rows: [] };
  const memberGroups = db
    ? await db.query<MemberGroupRow>(
        `select g.id, g.name, g.status, g.warning, g.flagged, c.name as community, c.slug,
                p.username, p.display_name,
                (select count(*) from public.group_members m where m.group_id = g.id) as members
         from public.community_groups g
         join public.communities c on c.id = g.community_id
         left join public.profiles p on p.id = g.owner_id
         where g.kind = 'member'
         order by g.created_at desc
         limit 40`,
      )
    : { rows: [] };
  const stats = counts.rows[0];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">Réseau</h1>
      {notice ? <p className="mt-4 border border-line bg-white p-4 text-sm">{notice}</p> : null}
      <section className="mt-6">
        <h2 className="text-lg font-bold">Demandes d&apos;établissements</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Un établissement n&apos;existe qu&apos;après accord. Le demandeur en devient le gérant principal.</p>
        <ul className="mt-3 grid gap-3">
          {requests.rows.map((request) => (
            <li key={request.id} className="border border-line bg-white p-4">
              <p className="text-sm font-bold">{request.name}</p>
              <p className="mt-1 text-sm text-muted">
                {request.community} · {request.display_name} · @{request.username}
              </p>
              {request.note ? <p className="mt-2 text-sm">{request.note}</p> : null}
              {request.duplicate ? <p className="mt-2 text-sm text-danger">Un établissement porte déjà ce nom.</p> : null}
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={reviewSchoolRequest}>
                  <input type="hidden" name="id" value={request.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button type="submit" className="text-sm font-semibold" disabled={request.duplicate}>
                    Approuver
                  </button>
                </form>
                <form action={reviewSchoolRequest}>
                  <input type="hidden" name="id" value={request.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <button type="submit" className="text-sm font-semibold text-danger">
                    Refuser
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        {requests.rows.length === 0 ? <p className="mt-3 text-sm text-muted">Aucune demande en attente.</p> : null}
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-bold">Groupes de membres</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Ces groupes sont créés sans demande. Vous pouvez les fermer, les signaler ou envoyer un avertissement.</p>
        <ul className="mt-3 grid gap-3">
          {memberGroups.rows.map((group) => (
            <li key={group.id} className="border border-line bg-white p-4">
              <p className="text-sm font-bold">
                {group.name}
                {group.status === "closed" ? " · fermé" : ""}
                {group.flagged ? " · signalé" : ""}
              </p>
              <p className="mt-1 text-sm text-muted">
                {group.community} · {group.display_name || "Administrateur"}
                {group.username ? ` · @${group.username}` : ""} · {group.members} {Number(group.members) > 1 ? "membres" : "membre"}
              </p>
              {group.warning ? <p className="mt-2 text-sm">Avertissement : {group.warning}</p> : null}
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/communautes/${group.slug}`} className="text-sm font-semibold">
                  Voir
                </Link>
                <form action={moderateMemberGroup}>
                  <input type="hidden" name="id" value={group.id} />
                  <input type="hidden" name="action" value={group.status === "closed" ? "reopen" : "close"} />
                  <button type="submit" className="text-sm font-semibold text-danger">
                    {group.status === "closed" ? "Rouvrir" : "Fermer"}
                  </button>
                </form>
                <form action={moderateMemberGroup}>
                  <input type="hidden" name="id" value={group.id} />
                  <input type="hidden" name="action" value={group.flagged ? "unflag" : "flag"} />
                  <button type="submit" className="text-sm font-semibold">
                    {group.flagged ? "Retirer le signalement" : "Signaler"}
                  </button>
                </form>
              </div>
              <form action={moderateMemberGroup} className="mt-3 grid gap-2">
                <input type="hidden" name="id" value={group.id} />
                <input type="hidden" name="action" value="warn" />
                <input name="message" maxLength={280} className="field" placeholder="Avertissement pour l'administrateur" aria-label="Avertissement" />
                <button type="submit" className="w-fit text-sm font-semibold">
                  Envoyer l&apos;avertissement
                </button>
              </form>
            </li>
          ))}
        </ul>
        {memberGroups.rows.length === 0 ? <p className="mt-3 text-sm text-muted">Aucun groupe de membres.</p> : null}
      </section>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Membres", stats?.profiles],
          ["Publications", stats?.posts],
          ["Signalements ouverts", stats?.reports],
        ].map(([label, value]) => (
          <p key={label} className="border border-line bg-white p-4">
            <span className="block text-2xl font-bold">{value ?? "0"}</span>
            <span className="text-sm text-muted">{label}</span>
          </p>
        ))}
      </div>
      <ul className="mt-8 grid gap-3">
        {reports.rows.map((report) => (
          <li key={report.id} className="border border-line bg-white p-4">
            <p className="text-sm font-bold">
              {report.target_type} · {reportReasons.find((item) => item.value === report.reason)?.label ?? report.reason} · {report.status}
            </p>
            <p className="mt-1 text-sm text-muted">Signalé par @{report.username}</p>
            {report.note ? <p className="mt-2 text-sm">{report.note}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {["post", "photo", "video"].includes(report.target_type) ? (
                <Link href={`/p/${report.target_id}`} className="text-sm font-semibold">
                  Voir
                </Link>
              ) : null}
              <form action={reviewReport}>
                <input type="hidden" name="id" value={report.id} />
                <input type="hidden" name="targetType" value={report.target_type} />
                <input type="hidden" name="targetId" value={report.target_id} />
                <input type="hidden" name="status" value="resolved" />
                <input type="hidden" name="hide" value="1" />
                <button type="submit" className="text-sm font-semibold text-danger">
                  Masquer et résoudre
                </button>
              </form>
              <form action={reviewReport}>
                <input type="hidden" name="id" value={report.id} />
                <input type="hidden" name="targetType" value={report.target_type} />
                <input type="hidden" name="targetId" value={report.target_id} />
                <input type="hidden" name="status" value="dismissed" />
                <button type="submit" className="text-sm font-semibold text-muted">
                  Classer sans suite
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
      {reports.rows.length === 0 ? <p className="mt-6 text-sm text-muted">Aucun signalement.</p> : null}
      <form action={setSuspension} className="mt-10 grid max-w-md gap-3 border border-line bg-white p-4">
        <h2 className="font-bold">Suspendre un compte</h2>
        <input name="userId" className="field" placeholder="Identifiant du profil" aria-label="Identifiant du profil" />
        <div className="flex gap-2">
          <button name="suspend" value="1" className="btn btn-primary h-10 min-h-0 px-3" type="submit">
            Suspendre
          </button>
          <button name="suspend" value="0" className="btn btn-line h-10 min-h-0 px-3" type="submit">
            Rétablir
          </button>
        </div>
      </form>
    </div>
  );
}
