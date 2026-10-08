import Link from "next/link";
import { formatInZone } from "@/lib/editorial/time";
import { getSettings, listEvents } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  profile_created: "Profil créé",
  profile_updated: "Profil modifié",
  profile_archived: "Profil archivé",
  profile_restored: "Profil réactivé",
  profile_disabled: "Profil désactivé",
  profile_enabled: "Profil activé",
  draft_created: "Brouillon créé",
  draft_updated: "Brouillon modifié",
  ai_draft: "Brouillon généré",
  scheduled: "Programmé",
  rescheduled: "Horaire modifié",
  unscheduled: "Programmation annulée",
  published: "Publié",
  failed: "Échec",
  archived: "Archivé",
  duplicated: "Dupliqué",
  publish_due: "Tâche de publication",
  settings_updated: "Règles modifiées",
};

export default async function HistoryPage() {
  const [events, settings] = await Promise.all([listEvents(80), getSettings()]);
  return (
    <ul className="grid gap-2">
      {events.length === 0 ? <li className="text-sm text-muted">Aucun événement.</li> : null}
      {events.map((event) => (
        <li key={event.id} className="border border-line bg-white px-4 py-3 text-sm">
          <span className="font-semibold">{labels[event.action] || event.action}</span>
          {event.detail ? <span className="text-muted"> · {event.detail}</span> : null}
          <span className="mt-1 block text-xs text-muted">
            {formatInZone(new Date(event.createdAt), settings.timezone)}
            {event.itemId ? <> · <Link href={`/admin/studio/${event.itemId}`}>Ouvrir</Link></> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
