import { saveEditorialProfile, setProfileState } from "@/lib/actions/editorial";
import { ConfirmSubmit } from "@/components/admin/studio/ConfirmSubmit";
import { Etat } from "@/components/admin/studio/Etat";
import { categoryLabel, editorialCategories } from "@/lib/editorial/constants";
import { listItems, listProfiles, profileDesk } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ etat?: string; profil?: string }> };

export default async function EditorialProfilesPage({ searchParams }: Props) {
  const { etat, profil } = await searchParams;
  const profiles = await listProfiles(true);
  const selected = profiles.find((profile) => profile.id === profil) ?? null;
  const [posts, desk] = selected ? await Promise.all([listItems({ profileId: selected.id, limit: 12 }), profileDesk(selected.id)]) : [[], null];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="grid gap-4">
        <Etat code={etat} />
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
                  <p className="mt-1 text-sm leading-6">{profile.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a href={`/admin/studio/profils?profil=${profile.id}`} className="text-sm font-semibold">Modifier</a>
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
        ) : null}
      </div>
      <form action={saveEditorialProfile} className="grid h-fit gap-3 border border-line bg-white p-4">
        <h2 className="font-bold">{selected ? "Modifier le profil" : "Nouveau profil"}</h2>
        {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
        <label className="grid gap-1 text-sm font-semibold">Nom
          <input name="name" required minLength={2} maxLength={40} defaultValue={selected?.name || ""} className="border border-line px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Identifiant
          <input name="slug" maxLength={40} defaultValue={selected?.slug || ""} placeholder="ty-space-tech" className="border border-line px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Description
          <textarea name="description" maxLength={280} defaultValue={selected?.description || ""} rows={4} className="border border-line px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Catégorie
          <select name="category" defaultValue={selected?.category || "officiel"} className="border border-line px-3 py-2 font-normal">
            {editorialCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Avatar
          <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="active" value="1" defaultChecked={selected ? selected.isActive : true} />
          Profil actif
        </label>
        <button type="submit" className="btn btn-primary">{selected ? "Enregistrer" : "Créer le profil"}</button>
      </form>
    </div>
  );
}
