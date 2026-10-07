import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { reviewReport, setSuspension } from "@/lib/actions/moderation";
import { dbPool } from "@/lib/media/db";
import { reportReasons } from "@/lib/network/constants";

export const dynamic = "force-dynamic";

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

export default async function AdminNetworkPage() {
  await requireAdmin();
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
  const stats = counts.rows[0];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold">Réseau</h1>
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
