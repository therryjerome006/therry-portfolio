import Link from "next/link";
import { setProfileState } from "@/lib/actions/editorial";
import { ConfirmSubmit } from "@/components/admin/studio/ConfirmSubmit";
import { Etat } from "@/components/admin/studio/Etat";
import { categoryLabel } from "@/lib/editorial/constants";
import { listItems, listProfiles, profileDesk } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ etat?: string; profil?: string }> };

export default async function EditorialProfilesPage({ searchParams }: Props) {
  const { etat, profil } = await searchParams;
  const profiles = await listProfiles(true);
  const selected = profiles.find((profile) => profile.id === profil) ?? null;
  const [posts, desk] = selected ? await Promise.all([listItems({ profileId: selected.id, limit: 12 }), profileDesk(selected.id)]) : [[], null];

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="grid gap-4">
        <Etat code={etat} />
        <Link href="/admin/studio/profils/nouveau" className="btn btn-primary w-fit">Nouveau présentateur</Link>
        <ul className="grid gap-3">
          {profiles.map((profile) => (
            <li key={profile.id} className="border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center bg-[#e4edf8] text-sm font-bold">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt="" className="h-12 w-12 object-cover" />
                  ) : profile.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{profile.name} <span className="text-xs font-semibold uppercase text-accent">Éditorial</span></p>
                  <p className="text-sm text-muted">@{profile.slug} · {categoryLabel(profile.category)} · {profile.archivedAt ? "archivé" : profile.isActive ? "actif" : "inactif"}</p>
                  <p className="mt-1 text-sm leading-6">{profile.description || "Aucune bio."}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link href={`/admin/studio/profils/${profile.id}`} className="text-sm font-semibold">Personnaliser</Link>
                    <a href={`/admin/studio/profils?profil=${profile.id}`} className="text-sm font-semibold">Activité</a>
                    <a href={`/admin/studio/bibliotheque?profil=${profile.id}`} className="text-sm font-semibold">Publications</a>
                    <a href={`/redaction/${profile.slug}`} className="text-sm font-semibold">Page publique</a>
                    {profile.archivedAt ? (
                      <ConfirmSubmit action={setProfileState} message="Rendre de nouveau ce profil visible ?" label="Réactiver" fields={{ id: profile.id, action: "restore" }} />
                    ) : (
                      <>
                        <ConfirmSubmit action={setProfileState} message={profile.isActive ? "Désactiver ce profil ? Les publications déjà en ligne restent visibles." : "Activer ce profil ?"} label={profile.isActive ? "Désactiver" : "Activer"} fields={{ id: profile.id, action: profile.isActive ? "off" : "on" }} />
                        <ConfirmSubmit action={setProfileState} message="Archiver ce profil ? Les publications quittent le public. Les abonnés et l'historique restent enregistrés." label="Archiver" fields={{ id: profile.id, action: "archive" }} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {selected ? (
          <section className="border border-line bg-white p-4">
            <h2 className="font-bold">Publications de {selected.name}</h2>
            <p className="mt-1 text-sm text-muted">{desk?.followers ?? 0} abonnés réels. La désactivation garde les publications et les abonnés.</p>
            <ul className="mt-2 text-sm">
              {posts.length === 0 ? <li className="text-muted">Aucune publication.</li> : posts.map((item) => <li key={item.id}>{item.status} · {(item.title || item.body).slice(0, 80)}</li>)}
            </ul>
            <h3 className="mt-4 font-semibold">Abonnés</h3>
            <ul className="mt-1 text-sm">{desk && desk.people.length > 0 ? desk.people.map((person) => <li key={person.username}>{person.name} · @{person.username}</li>) : <li className="text-muted">Aucun abonné.</li>}</ul>
            <h3 className="mt-4 font-semibold">Commentaires</h3>
            <ul className="mt-1 text-sm">{desk && desk.comments.length > 0 ? desk.comments.map((comment) => <li key={comment.id}>{comment.name} · {comment.body.slice(0, 120)}</li>) : <li className="text-muted">Aucun commentaire.</li>}</ul>
            <h3 className="mt-4 font-semibold">Signalements</h3>
            <ul className="mt-1 text-sm">{desk && desk.reports.length > 0 ? desk.reports.map((report) => <li key={report.id}>{report.target} · {report.reason} · {report.status}</li>) : <li className="text-muted">Aucun signalement.</li>}</ul>
          </section>
        ) : (
          <p className="text-sm text-muted">Choisissez Activité sur un présentateur pour voir ses abonnés, commentaires et signalements.</p>
        )}
      </div>
    </div>
  );
}
