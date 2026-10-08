import Link from "next/link";
import { publishDueNow, saveEditorialSettings } from "@/lib/actions/editorial";
import { Etat } from "@/components/admin/studio/Etat";
import { editorialTimezones } from "@/lib/editorial/constants";
import { formatInZone } from "@/lib/editorial/time";
import { getSettings, listEvents, listItems, studioStats } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ etat?: string }> };

export default async function StudioHome({ searchParams }: Props) {
  const { etat } = await searchParams;
  const [stats, settings, upcoming, recent, errors] = await Promise.all([
    studioStats(),
    getSettings(),
    listItems({ status: "scheduled", limit: 5 }),
    listItems({ limit: 5 }),
    listEvents(8),
  ]);
  const cards = [
    ["Profils actifs", stats.activeProfiles],
    ["Brouillons", stats.drafts],
    ["Programmées", stats.scheduled],
    ["Publiées", stats.published],
    ["Échecs", stats.failed],
    ["Réactions réelles", stats.likes],
    ["Commentaires réels", stats.comments],
  ];
  const cronReady = Boolean(process.env.CRON_SECRET);

  return (
    <div className="grid gap-6">
      <Etat code={etat} />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={String(label)} className="border border-line bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section>
      <section className="border border-line bg-white p-4 text-sm leading-6">
        <h2 className="text-lg font-bold">Publication automatique</h2>
        {cronReady ? (
          <p className="mt-2">La tâche quotidienne est configurée. Elle publie les contenus dont l&apos;heure est passée, une fois par jour à 12:00 UTC. Pour publier plus tôt, utilisez le bouton ci-dessous.</p>
        ) : (
          <p className="mt-2">La publication automatique n&apos;est pas active : la variable CRON_SECRET est absente. Les contenus programmés restent en attente jusqu&apos;au clic sur « Publier les contenus dus ».</p>
        )}
        {settings.paused ? <p className="mt-2 font-semibold">Les programmations automatiques sont suspendues.</p> : null}
        <form action={publishDueNow} className="mt-3">
          <button type="submit" className="btn btn-primary">Publier les contenus dus</button>
        </form>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-white p-4">
          <h2 className="font-bold">Prochaines publications</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {upcoming.length === 0 ? <li className="text-muted">Aucune publication programmée.</li> : null}
            {upcoming.map((item) => (
              <li key={item.id}>
                <Link href={`/admin/studio/${item.id}`} className="font-semibold">{item.title || item.body.slice(0, 80) || "Sans texte"}</Link>
                <span className="mt-1 block text-muted">{item.profileName} · {item.scheduledAt ? formatInZone(new Date(item.scheduledAt), settings.timezone) : ""}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="border border-line bg-white p-4">
          <h2 className="font-bold">Dernières erreurs</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {errors.filter((event) => event.action === "failed").length === 0 ? <li className="text-muted">Aucune erreur enregistrée.</li> : null}
            {errors.filter((event) => event.action === "failed").map((event) => (
              <li key={event.id}>{event.detail || "Échec"} · {formatInZone(new Date(event.createdAt), settings.timezone)}</li>
            ))}
          </ul>
        </section>
      </div>
      <section className="border border-line bg-white p-4">
        <h2 className="font-bold">Règles de diffusion</h2>
        <p className="mt-1 text-sm text-muted">Fuseau utilisé pour programmer : {settings.timezone}. Les heures sont enregistrées en UTC.</p>
        <form action={saveEditorialSettings} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">Maximum par jour
            <input name="maxPerDay" type="number" min={1} max={24} defaultValue={settings.maxPerDay} className="border border-line px-3 py-2 font-normal" required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Intervalle minimum (minutes)
            <input name="interval" type="number" min={15} max={720} defaultValue={settings.minIntervalMinutes} className="border border-line px-3 py-2 font-normal" required />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Fuseau
            <select name="timezone" defaultValue={settings.timezone} className="border border-line px-3 py-2 font-normal">
              {editorialTimezones.map((zone) => <option key={zone}>{zone}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input name="paused" value="1" type="checkbox" defaultChecked={settings.paused} />
            Suspendre les programmations automatiques
          </label>
          <button type="submit" className="btn btn-line sm:col-span-2">Enregistrer les règles</button>
        </form>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <article className="border border-line bg-white p-4">
          <h2 className="font-bold">Par profil</h2>
          <ul className="mt-2 text-sm">{stats.byProfile.length === 0 ? <li className="text-muted">Aucun profil.</li> : stats.byProfile.map((row) => <li key={row.name}>{row.name} · {row.count} publiée{row.count > 1 ? "s" : ""}</li>)}</ul>
        </article>
        <article className="border border-line bg-white p-4">
          <h2 className="font-bold">Par catégorie</h2>
          <ul className="mt-2 text-sm">{stats.byCategory.length === 0 ? <li className="text-muted">Aucune publication pour le moment.</li> : stats.byCategory.map((row) => <li key={row.category}>{row.category} · {row.count}</li>)}</ul>
        </article>
      </section>
      <section>
        <h2 className="font-bold">Récemment préparés</h2>
        <ul className="mt-2 grid gap-2 text-sm">
          {recent.length === 0 ? <li className="text-muted">Aucun contenu.</li> : null}
          {recent.map((item) => (
            <li key={item.id}><Link href={`/admin/studio/${item.id}`} className="font-semibold">{item.profileName}</Link> · {item.status} · {(item.title || item.body).slice(0, 90)}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
