import Link from "next/link";
import { editorialItemAction, scheduleSelection } from "@/lib/actions/editorial";
import { ConfirmSubmit } from "@/components/admin/studio/ConfirmSubmit";
import { Etat } from "@/components/admin/studio/Etat";
import { editorialKinds, editorialStatuses, isEditorialKind, isEditorialStatus, kindLabel, statusLabel } from "@/lib/editorial/constants";
import { formatInZone } from "@/lib/editorial/time";
import { getSettings, listItems, listProfiles } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function LibraryPage({ searchParams }: Props) {
  const query = await searchParams;
  const status = query.statut && isEditorialStatus(query.statut) ? query.statut : "";
  const kind = query.format && isEditorialKind(query.format) ? query.format : "";
  const [items, profiles, settings] = await Promise.all([
    listItems({
      status,
      kind,
      profileId: query.profil,
      category: query.categorie,
      q: query.q,
    }),
    listProfiles(true),
    getSettings(),
  ]);

  return (
    <div className="grid gap-4">
      <Etat code={query.etat} />
      <form className="grid gap-3 border border-line bg-white p-4 sm:grid-cols-3">
        <input name="q" defaultValue={query.q || ""} placeholder="Texte ou titre" className="border border-line px-3 py-2 text-sm" />
        <select name="profil" defaultValue={query.profil || ""} className="border border-line px-3 py-2 text-sm">
          <option value="">Tous les profils</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
        <select name="statut" defaultValue={status} className="border border-line px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {editorialStatuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select name="format" defaultValue={kind} className="border border-line px-3 py-2 text-sm">
          <option value="">Tous les formats</option>
          {editorialKinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <input name="categorie" defaultValue={query.categorie || ""} placeholder="Catégorie" className="border border-line px-3 py-2 text-sm" />
        <button type="submit" className="btn btn-line">Filtrer</button>
      </form>
      <form id="plan-form" action={scheduleSelection} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold">Programmer la sélection ({settings.timezone})
          <input name="when" type="datetime-local" className="border border-line px-3 py-2 font-normal" />
        </label>
        <button type="submit" className="btn btn-primary">Programmer la sélection</button>
      </form>
      <ul className="grid gap-3">
          {items.length === 0 ? <li className="text-sm text-muted">Aucun contenu pour ces filtres.</li> : null}
          {items.map((item) => (
            <li key={item.id} className="border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="flex items-start gap-3">
                  {item.status === "draft" || item.status === "failed" ? <input form="plan-form" type="checkbox" name="id" value={item.id} className="mt-1" /> : null}
                  <span>
                    <span className="block font-bold">{item.title || item.body.slice(0, 90) || "Sans texte"}</span>
                    <span className="mt-1 block text-sm text-muted">{item.profileName} · {kindLabel(item.kind)} · {statusLabel(item.status)}{item.category ? ` · ${item.category}` : ""}</span>
                    <span className="mt-1 block text-xs text-muted">
                      Créé {formatInZone(new Date(item.createdAt), settings.timezone)}
                      {item.scheduledAt ? ` · programmé ${formatInZone(new Date(item.scheduledAt), settings.timezone)}` : ""}
                      {item.publishedAt ? ` · publié ${formatInZone(new Date(item.publishedAt), settings.timezone)}` : ""}
                    </span>
                    {item.error ? <span className="mt-1 block text-sm">{item.error}</span> : null}
                  </span>
                </label>
                <span className="flex flex-wrap gap-3">
                  <Link href={`/admin/studio/${item.id}`} className="text-sm font-semibold">Ouvrir</Link>
                  {item.status === "scheduled" ? <ConfirmSubmit action={editorialItemAction} message="Annuler cette programmation ?" label="Déprogrammer" fields={{ id: item.id, action: "unschedule" }} /> : null}
                  {item.status !== "published" && item.status !== "archived" ? <ConfirmSubmit action={editorialItemAction} message="Publier ce contenu maintenant ?" label="Publier" fields={{ id: item.id, action: "publish" }} /> : null}
                  <ConfirmSubmit action={editorialItemAction} message="Dupliquer en brouillon ?" label="Dupliquer" fields={{ id: item.id, action: "duplicate" }} />
                  {item.status !== "archived" ? <ConfirmSubmit action={editorialItemAction} message="Archiver ce contenu ?" label="Archiver" fields={{ id: item.id, action: "archive" }} /> : null}
                </span>
              </div>
              {item.status === "scheduled" || item.status === "failed" ? (
                <form action={editorialItemAction} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="action" value="reschedule" />
                  <input name="when" type="datetime-local" className="border border-line px-3 py-2 text-sm" required />
                  <button type="submit" className="btn btn-line">Changer l&apos;heure</button>
                </form>
              ) : null}
            </li>
          ))}
      </ul>
    </div>
  );
}
