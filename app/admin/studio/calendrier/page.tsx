import Link from "next/link";
import { editorialItemAction } from "@/lib/actions/editorial";
import { ConfirmSubmit } from "@/components/admin/studio/ConfirmSubmit";
import { editorialCategories, kindLabel } from "@/lib/editorial/constants";
import { dayKey, formatInZone } from "@/lib/editorial/time";
import { getSettings, listItems, listProfiles } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ profil?: string; categorie?: string; format?: string }> };

export default async function CalendarPage({ searchParams }: Props) {
  const query = await searchParams;
  const [items, profiles, settings] = await Promise.all([
    listItems({ status: "scheduled", profileId: query.profil, category: query.categorie, kind: query.format, limit: 200 }),
    listProfiles(false),
    getSettings(),
  ]);
  const days = new Map<string, typeof items>();
  for (const item of items) {
    if (!item.scheduledAt) continue;
    const key = dayKey(new Date(item.scheduledAt), settings.timezone);
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  const ordered = [...days.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="grid gap-4">
      <form className="flex flex-wrap gap-2">
        <select name="profil" defaultValue={query.profil || ""} className="border border-line bg-white px-3 py-2 text-sm">
          <option value="">Tous les profils</option>
          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
        <select name="categorie" defaultValue={query.categorie || ""} className="border border-line bg-white px-3 py-2 text-sm">
          <option value="">Toutes les catégories</option>
          {editorialCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
        <select name="format" defaultValue={query.format || ""} className="border border-line bg-white px-3 py-2 text-sm">
          <option value="">Tous les formats</option>
          <option value="text">Texte</option>
          <option value="photo">Photo</option>
          <option value="video">Vidéo</option>
          <option value="article">Article</option>
        </select>
        <button type="submit" className="btn btn-line">Filtrer</button>
      </form>
      <p className="text-sm text-muted">Heures affichées en {settings.timezone}, jour par jour.</p>
      {ordered.length === 0 ? <p className="text-sm text-muted">Aucune publication programmée.</p> : null}
      <div className="grid gap-4">
        {ordered.map(([day, rows]) => (
          <section key={day} className="border border-line bg-white p-4">
            <h2 className="font-bold">{day}</h2>
            <ul className="mt-3 grid gap-3">
              {rows.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-semibold">{item.scheduledAt ? formatInZone(new Date(item.scheduledAt), settings.timezone) : ""}</span>
                    {" · "}{item.profileName} · {kindLabel(item.kind)} · {(item.title || item.body).slice(0, 80)}
                  </span>
                  <span className="flex gap-3">
                    <Link href={`/admin/studio/${item.id}`} className="font-semibold">Modifier</Link>
                    <ConfirmSubmit action={editorialItemAction} message="Annuler cette programmation ?" label="Annuler" fields={{ id: item.id, action: "unschedule" }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
