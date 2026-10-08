import Link from "next/link";
import { notFound } from "next/navigation";
import { Composer } from "@/components/admin/studio/Composer";
import { ConfirmSubmit } from "@/components/admin/studio/ConfirmSubmit";
import { Etat } from "@/components/admin/studio/Etat";
import { editorialItemAction } from "@/lib/actions/editorial";
import { getItem, getSettings, listProfiles } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ etat?: string }> };

export default async function EditEditorialPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { etat } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [item, profiles, settings] = await Promise.all([getItem(id), listProfiles(true), getSettings()]);
  if (!item) notFound();
  return (
    <div className="grid gap-4">
      <Etat code={etat} />
      <p className="text-sm text-muted">Statut : {item.status}{item.publishedAt ? ` · publié` : ""}</p>
      {item.status === "published" && item.kind !== "article" ? <p className="text-sm"><Link href={`/p/${item.id}`} className="font-semibold">Voir en public</Link></p> : null}
      {item.kind === "article" && item.status === "published" ? <p className="text-sm"><Link href={`/articles/${item.id}`} className="font-semibold">Voir l&apos;article</Link></p> : null}
      <Composer profiles={profiles.filter((profile) => !profile.archivedAt)} item={item} timezone={settings.timezone} />
      <div className="flex flex-wrap gap-4">
        <ConfirmSubmit action={editorialItemAction} message="Archiver ce contenu ? Il quittera le fil public, sans être effacé." label="Archiver" fields={{ id: item.id, action: "archive" }} />
        <ConfirmSubmit action={editorialItemAction} message="Créer un nouveau brouillon à partir de ce contenu ?" label="Dupliquer" fields={{ id: item.id, action: "duplicate" }} />
      </div>
    </div>
  );
}
