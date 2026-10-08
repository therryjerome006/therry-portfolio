"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ageBands } from "@/lib/network/constants";
import { updateProfile } from "@/lib/actions/social";
import type { PublicProfile } from "@/lib/social/queries";
import { browserClient } from "@/lib/supabase/browser";

export function ProfileEditor({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(profile.avatarUrl);
  const [remove, setRemove] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

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
    <div className="grid gap-6">
      <form
        className="grid gap-5 border-[3px] border-[#12263f] bg-white p-6"
        action={(formData) => {
          setSaved(false);
          start(async () => {
            const result = await updateProfile(formData);
            if (result.error) setError(result.error);
            else {
              setError("");
              setSaved(true);
              router.refresh();
            }
          });
        }}
      >
        <label className="grid gap-2 text-sm font-semibold">
          Nom affiché
          <input name="displayName" defaultValue={profile.displayName} required maxLength={40} className="field" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Nom d&apos;utilisateur
          <input name="username" defaultValue={profile.username} required minLength={3} maxLength={24} className="field" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Bio
          <textarea name="bio" defaultValue={profile.bio} maxLength={280} rows={4} className="field" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Centres d&apos;intérêt
          <input name="interests" defaultValue={profile.interests} maxLength={160} className="field" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Lien personnel
          <input name="website" type="url" defaultValue={profile.website} maxLength={120} className="field" placeholder="https://" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Tranche d&apos;âge
          <select name="ageBand" className="field" defaultValue={profile.ageBand}>
            <option value="unknown">Non précisée</option>
            {ageBands.map((band) => (
              <option key={band.value} value={band.value}>
                {band.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs leading-5 text-muted">La tranche d&apos;âge n&apos;est pas affichée. Elle sert à limiter les contacts entre les moins de 18 ans et les comptes de 23 ans et plus.</p>
        <label className="flex items-start gap-2 text-sm">
          <input name="showRelations" type="checkbox" defaultChecked={profile.showRelations} className="mt-1" />
          <span>Afficher mes abonnés et mes abonnements sur mon profil public.</span>
        </label>
        <div className="grid gap-3">
          <span className="text-sm font-semibold">Photo de profil</span>
          <span className="grid h-16 w-16 place-items-center bg-[#e4edf8] text-2xl font-bold">
            {preview && !remove ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-16 w-16 object-cover" />
            ) : (
              profile.displayName.slice(0, 1).toUpperCase()
            )}
          </span>
          <label className="grid gap-2 text-sm font-semibold">
            Choisir une photo
            <input ref={fileRef} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={onPhoto} />
          </label>
          <p className="text-xs leading-5 text-muted">JPEG, PNG ou WebP, 2 Mo maximum.</p>
          {profile.avatarUrl ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                name="removeAvatar"
                type="checkbox"
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
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {saved ? <p className="text-sm text-ink">Profil enregistré.</p> : null}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
      <button
        type="button"
        className="btn btn-line w-fit"
        onClick={async () => {
          await browserClient()?.auth.signOut();
          router.push("/");
          router.refresh();
        }}
      >
        Se déconnecter
      </button>
    </div>
  );
}
