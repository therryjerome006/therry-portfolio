"use client";

import { useFormStatus } from "react-dom";
import { generateEditorialDrafts } from "@/lib/actions/editorial";
import { AI_BATCH_MAX, editorialCategories, editorialKinds, editorialLanguages, editorialTones } from "@/lib/editorial/constants";
import type { EditorialProfile } from "@/lib/editorial/store";

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Génération…" : "Générer des brouillons"}</button>;
}

export function GenerateForm({ profiles, enabled }: { profiles: EditorialProfile[]; enabled: boolean }) {
  return (
    <form action={generateEditorialDrafts} className="grid gap-4 border border-line bg-white p-4">
      {!enabled ? <p className="text-sm">L&apos;IA n&apos;est pas configurée. Vous pouvez continuer à écrire dans « Nouvelle publication ».</p> : null}
      <label className="grid gap-1 text-sm font-semibold">Nombre de brouillons (maximum {AI_BATCH_MAX})
        <input name="count" type="number" min={1} max={AI_BATCH_MAX} defaultValue={4} className="border border-line px-3 py-2 font-normal" />
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Catégories</legend>
        {editorialCategories.map((category) => (
          <label key={category.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="category" value={category.id} />{category.label}</label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Formats</legend>
        {editorialKinds.map((kind) => (
          <label key={kind.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="kind" value={kind.id} defaultChecked={kind.id === "text"} />{kind.label}</label>
        ))}
      </fieldset>
      <label className="grid gap-1 text-sm font-semibold">Ton
        <select name="tone" className="border border-line px-3 py-2 font-normal">{editorialTones.map((tone) => <option key={tone.id} value={tone.id}>{tone.label}</option>)}</select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Langue
        <select name="language" className="border border-line px-3 py-2 font-normal">{editorialLanguages.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}</select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Public
        <input name="audience" defaultValue="Jeunes de 12 à 22 ans" maxLength={80} className="border border-line px-3 py-2 font-normal" />
      </label>
      <label className="grid gap-1 text-sm font-semibold">Profil
        <select name="profileSlug" className="border border-line px-3 py-2 font-normal">
          {profiles.map((profile) => <option key={profile.id} value={profile.slug}>{profile.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Longueur
        <select name="length" className="border border-line px-3 py-2 font-normal">
          <option value="courte">Courte, pour le fil</option>
          <option value="moyenne">Moyenne, pour le fil</option>
          <option value="article">Article</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Sujets à éviter
        <textarea name="avoid" maxLength={280} rows={3} className="border border-line px-3 py-2 font-normal" />
      </label>
      <Submit />
    </form>
  );
}
