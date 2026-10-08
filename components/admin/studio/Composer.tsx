"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { saveEditorialItem } from "@/lib/actions/editorial";
import { editorialLanguages, kindLabel, type EditorialKind } from "@/lib/editorial/constants";
import type { EditorialItem, EditorialProfile } from "@/lib/editorial/store";

function Submit({ value, label, primary = false }: { value: string; label: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="intent" value={value} className={primary ? "btn btn-primary" : "btn btn-line"} disabled={pending}>
      {pending ? "En cours…" : label}
    </button>
  );
}

export function Composer({
  profiles,
  item,
  timezone,
}: {
  profiles: EditorialProfile[];
  item?: EditorialItem | null;
  timezone: string;
}) {
  const [kind, setKind] = useState<EditorialKind>(item?.kind || "text");
  const [body, setBody] = useState(item?.body || "");
  const [title, setTitle] = useState(item?.title || "");
  const [discussion, setDiscussion] = useState(item?.discussion || "");
  const [profileId, setProfileId] = useState(item?.profileId || profiles[0]?.id || "");
  const [preview, setPreview] = useState(item?.mediaUrl || item?.coverUrl || "");
  const profile = profiles.find((entry) => entry.id === profileId);
  const max = kind === "article" ? 20000 : 500;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <form action={saveEditorialItem} className="grid gap-3 border border-line bg-white p-4">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <label className="grid gap-1 text-sm font-semibold">Profil éditorial
          <select name="profileId" value={profileId} onChange={(event) => setProfileId(event.target.value)} className="border border-line px-3 py-2 font-normal">
            {profiles.map((entry) => (
              <option key={entry.id} value={entry.id} disabled={!entry.isActive || Boolean(entry.archivedAt)}>
                {entry.name}{entry.isActive ? "" : " (inactif)"}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Format
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value as EditorialKind)} className="border border-line px-3 py-2 font-normal">
            {(["text", "photo", "video", "article"] as const).map((value) => <option key={value} value={value}>{kindLabel(value)}</option>)}
          </select>
        </label>
        {kind === "article" ? (
          <label className="grid gap-1 text-sm font-semibold">Titre
            <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="border border-line px-3 py-2 font-normal" />
          </label>
        ) : <input type="hidden" name="title" value={title} />}
        <label className="grid gap-1 text-sm font-semibold">Texte
          <textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={max} rows={kind === "article" ? 12 : 5} className="border border-line px-3 py-2 font-normal" />
        </label>
        <p className="text-xs text-muted">{body.length} / {max}</p>
        <label className="grid gap-1 text-sm font-semibold">Question pour la discussion
          <input name="discussion" value={discussion} onChange={(event) => setDiscussion(event.target.value)} maxLength={200} className="border border-line px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Catégorie
          <input name="category" defaultValue={item?.category || profile?.category || ""} maxLength={40} className="border border-line px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">Langue
          <select name="language" defaultValue={item?.language || "fr"} className="border border-line px-3 py-2 font-normal">
            {editorialLanguages.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
          </select>
        </label>
        {kind === "photo" || kind === "video" ? (
          <label className="grid gap-1 text-sm font-semibold">{kind === "photo" ? "Photo (JPEG, PNG ou WebP, 8 Mo)" : "Vidéo MP4, 15 secondes, 25 Mo"}
            <input name="file" type="file" accept={kind === "photo" ? "image/jpeg,image/png,image/webp" : "video/mp4"} onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : item?.mediaUrl || "");
            }} />
          </label>
        ) : null}
        {kind === "article" ? (
          <label className="grid gap-1 text-sm font-semibold">Image de couverture
            <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : item?.coverUrl || "");
            }} />
          </label>
        ) : null}
        <label className="grid gap-1 text-sm font-semibold">Programmer ({timezone})
          <input name="when" type="datetime-local" className="border border-line px-3 py-2 font-normal" />
        </label>
        {item?.note ? <p className="text-sm text-muted">{item.note}</p> : null}
        {item?.error ? <p className="text-sm">Erreur : {item.error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Submit value="draft" label={item?.status === "published" ? "Enregistrer" : "Enregistrer comme brouillon"} primary={item?.status === "published"} />
          {item?.status === "published" ? null : (
            <>
              <Submit value="publish" label="Publier maintenant" primary />
              <Submit value="schedule" label="Programmer" />
            </>
          )}
        </div>
      </form>
      <aside className="border border-line bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Aperçu</p>
        <p className="mt-3 text-sm font-bold">{profile?.name || "Profil"} <span className="ml-1 border border-accent px-1 text-[0.65rem] uppercase text-accent">Éditorial</span></p>
        {kind === "article" && title ? <h2 className="mt-3 text-xl font-bold">{title}</h2> : null}
        {preview && kind !== "video" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="mt-3 aspect-video w-full object-cover" />
        ) : null}
        {preview && kind === "video" ? <video src={preview} className="mt-3 w-full" controls /> : null}
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{body || "Le texte apparaîtra ici."}</p>
        {discussion ? <p className="mt-3 text-sm font-semibold">{discussion}</p> : null}
      </aside>
    </div>
  );
}
