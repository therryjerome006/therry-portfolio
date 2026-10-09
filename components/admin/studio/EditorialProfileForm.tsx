"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { saveEditorialProfile } from "@/lib/actions/editorial";
import { editorialCategories } from "@/lib/editorial/constants";

export function EditorialProfileForm({
  profile,
}: {
  profile?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    website: string;
    category: string;
    avatarUrl: string;
    isActive: boolean;
  };
}) {
  const [preview, setPreview] = useState(profile?.avatarUrl || "");
  const [remove, setRemove] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = profile?.name || "Présentateur";

  function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setRemove(false);
    setPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  return (
    <form action={saveEditorialProfile} className="grid max-w-lg gap-5 border border-line bg-white p-6">
      {profile ? <input type="hidden" name="id" value={profile.id} /> : null}
      <label className="grid gap-2 text-sm font-semibold">
        Nom affiché
        <input name="name" required minLength={2} maxLength={40} defaultValue={profile?.name || ""} className="field font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Identifiant public
        <input name="slug" maxLength={40} defaultValue={profile?.slug || ""} placeholder="ty-space-tech" className="field font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Bio
        <textarea name="description" maxLength={280} rows={4} defaultValue={profile?.description || ""} className="field font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Lien
        <input name="website" type="url" maxLength={120} defaultValue={profile?.website || ""} placeholder="https://" className="field font-normal" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Catégorie
        <select name="category" defaultValue={profile?.category || "officiel"} className="field font-normal">
          {editorialCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3">
        <span className="text-sm font-semibold">Photo de profil</span>
        <span className="grid h-16 w-16 place-items-center bg-[#e4edf8] text-2xl font-bold">
          {preview && !remove ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-16 w-16 object-cover" />
          ) : (
            initial.slice(0, 1).toUpperCase()
          )}
        </span>
        <label className="grid gap-2 text-sm font-semibold">
          Choisir une photo
          <input ref={fileRef} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm font-normal" onChange={onPhoto} />
        </label>
        <p className="text-xs leading-5 text-muted">JPEG, PNG ou WebP, 2 Mo maximum. L&apos;aperçu s&apos;affiche avant l&apos;enregistrement.</p>
        {profile?.avatarUrl ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              name="removeAvatar"
              type="checkbox"
              value="1"
              checked={remove}
              onChange={(event) => {
                setRemove(event.target.checked);
                if (event.target.checked && fileRef.current) fileRef.current.value = "";
              }}
            />
            Retirer la photo
          </label>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="active" value="1" defaultChecked={profile ? profile.isActive : true} />
        Profil actif
      </label>
      <button type="submit" className="btn btn-primary w-fit">
        {profile ? "Enregistrer le profil" : "Créer le présentateur"}
      </button>
    </form>
  );
}
