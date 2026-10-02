"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions/social";
import type { PublicProfile } from "@/lib/social/queries";
import { browserClient } from "@/lib/supabase/browser";

export function ProfileEditor({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

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
          Avatar (adresse https, facultatif)
          <input name="avatarUrl" defaultValue={profile.avatarUrl} className="field" placeholder="https://" />
        </label>
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
