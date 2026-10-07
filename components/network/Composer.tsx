"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPost } from "@/lib/actions/network";

const kinds = [
  { id: "text", label: "Twit" },
  { id: "photo", label: "Photo" },
  { id: "video", label: "Vidéo" },
] as const;

export function Composer({
  initialKind,
  communities,
}: {
  initialKind: "text" | "photo" | "video";
  communities: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState(initialKind);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-4 border border-line bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("kind", kind);
        setError("");
        start(async () => {
          const result = await createPost(form);
          if (result.auth) {
            router.push(`/connexion?next=${encodeURIComponent(`/publier?type=${kind}`)}`);
            return;
          }
          if (result.error) setError(result.error);
          else if (result.id) router.push(`/p/${result.id}`);
        });
      }}
    >
      <div className="flex gap-2" role="tablist" aria-label="Type de publication">
        {kinds.map((item) => (
          <button key={item.id} type="button" className={`h-10 px-3 text-sm font-semibold ${kind === item.id ? "bg-accent text-white" : "border border-line text-ink"}`} onClick={() => setKind(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        {kind === "text" ? "Twit" : "Texte d'accompagnement"}
        <textarea name="body" required={kind === "text"} maxLength={500} rows={4} className="field" placeholder={kind === "text" ? "Quoi de neuf ?" : "Facultatif"} />
      </label>
      {kind !== "text" ? (
        <label className="grid gap-2 text-sm font-semibold">
          {kind === "photo" ? "Photo" : "Vidéo MP4, 15 secondes maximum"}
          <input name="file" type="file" required accept={kind === "photo" ? "image/jpeg,image/png,image/webp" : "video/mp4"} className="text-sm" />
        </label>
      ) : null}
      {communities.length > 0 ? (
        <label className="grid gap-2 text-sm font-semibold">
          Communauté
          <select name="community" className="field" defaultValue="">
            <option value="">Aucune</option>
            {communities.map((community) => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Publication…" : "Publier"}
        </button>
        <Link href="/" className="text-sm font-semibold text-muted">
          Annuler
        </Link>
      </div>
    </form>
  );
}
