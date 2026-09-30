"use client";

import { useActionState, useState } from "react";
import { saveActivity, type ActivityFormState } from "@/lib/actions/activities";
import type { ActivityPost } from "@/lib/activities/db";
import { activityCategories, type ActivityCategory } from "@/data/activities";
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, type UploadKind } from "@/lib/media/constants";
import { validateUpload } from "@/lib/media/validate";

const MAX_ITEMS = 12;

type Slide = {
  key: string;
  url: string;
  bucket: string;
  storagePath: string;
  kind: "image" | "video";
  preview: string;
};

function uploadFile(file: File, kind: UploadKind, onProgress: (value: number) => void) {
  return new Promise<Omit<Slide, "key" | "preview" | "kind">>((resolve, reject) => {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      const payload = JSON.parse(xhr.responseText || "{}") as { url?: string; bucket?: string; storagePath?: string; error?: string };
      if (xhr.status >= 200 && xhr.status < 300 && payload.url && payload.bucket && payload.storagePath) {
        resolve({ url: payload.url, bucket: payload.bucket, storagePath: payload.storagePath });
      } else reject(new Error(payload.error || "Envoi impossible."));
    };
    xhr.onerror = () => reject(new Error("Envoi impossible."));
    xhr.send(body);
  });
}

export function ActivityComposer({ post, saved }: { post?: ActivityPost; saved?: boolean }) {
  const [state, action, pending] = useActionState<ActivityFormState, FormData>(saveActivity, {});
  const [category, setCategory] = useState<ActivityCategory>(post?.category ?? "Sport");
  const [description, setDescription] = useState(post?.description ?? "");
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "published");
  const [slides, setSlides] = useState<Slide[]>(
    () =>
      post?.items.map((item) => ({
        key: item.id,
        url: item.url,
        bucket: item.bucket,
        storagePath: item.storagePath,
        kind: item.kind,
        preview: item.url,
      })) ?? [],
  );
  const [progress, setProgress] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");
  const originalUrls = new Set(post?.items.map((item) => item.url) ?? []);

  async function addFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    setLocalError("");
    if (slides.length + files.length > MAX_ITEMS) {
      setLocalError(`Maximum ${MAX_ITEMS} fichiers par publication.`);
      return;
    }
    const next: Slide[] = [];
    for (const [index, file] of files.entries()) {
      const kind: UploadKind = file.type.startsWith("video/") ? "video" : "image";
      const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
      const detected = validateUpload(header, kind, file.size);
      if (typeof detected === "string") {
        setLocalError(detected);
        continue;
      }
      const max = detected.kind === "video" ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
      if (file.size > max) {
        setLocalError(`Fichier trop lourd. Maximum ${Math.round(max / (1024 * 1024))} Mo.`);
        continue;
      }
      setProgress(`${index + 1} / ${files.length}`);
      try {
        const uploaded = await uploadFile(file, detected.kind, () => undefined);
        next.push({
          key: crypto.randomUUID(),
          ...uploaded,
          kind: detected.kind,
          preview: URL.createObjectURL(file),
        });
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : "Envoi impossible.");
      }
    }
    setSlides((current) => [...current, ...next]);
    setProgress(null);
  }

  async function removeSlide(key: string) {
    const slide = slides.find((item) => item.key === key);
    setSlides((current) => current.filter((item) => item.key !== key));
    if (slide && !originalUrls.has(slide.url)) {
      await fetch("/api/admin/media/object", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: slide.url }),
      });
    }
  }

  function move(key: string, direction: -1 | 1) {
    setSlides((current) => {
      const index = current.findIndex((item) => item.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  }

  const error = localError || state?.error;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="status" value={status} />
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          slides.map((slide) => ({
            kind: slide.kind,
            url: slide.url,
            bucket: slide.bucket,
            storagePath: slide.storagePath,
          })),
        )}
      />

      <div className="border-[3px] border-[#12263f] bg-white">
        {slides.length === 0 ? (
          <label className="grid aspect-[4/5] cursor-pointer place-items-center bg-black px-6 text-center text-sm font-semibold text-white">
            Ajouter des photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
              multiple
              className="sr-only"
              onChange={(event) => {
                void addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        ) : (
          <ul className="grid grid-cols-3 gap-2 p-3">
            {slides.map((slide, index) => (
              <li key={slide.key} className="border border-line">
                {slide.kind === "video" ? (
                  <video src={slide.preview} className="aspect-square w-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.preview} alt="" className="aspect-square w-full object-cover" />
                )}
                <div className="flex">
                  <button type="button" className="h-8 flex-1 text-sm font-bold" aria-label="Reculer" onClick={() => move(slide.key, -1)} disabled={index === 0}>
                    ‹
                  </button>
                  <button type="button" className="h-8 flex-1 text-sm font-bold" aria-label="Avancer" onClick={() => move(slide.key, 1)} disabled={index === slides.length - 1}>
                    ›
                  </button>
                  <button type="button" className="h-8 flex-1 text-sm text-danger" aria-label="Retirer" onClick={() => void removeSlide(slide.key)}>
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {slides.length > 0 ? (
          <label className="block cursor-pointer border-t border-line px-4 py-3 text-center text-sm font-semibold">
            Ajouter des photos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
              multiple
              className="sr-only"
              onChange={(event) => {
                void addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        ) : null}
        {progress ? <p className="border-t border-line px-4 py-3 text-xs font-semibold">Envoi… {progress}</p> : null}
      </div>

      <div className="border-[3px] border-[#12263f] bg-white p-5">
        {saved ? (
          <p className="mb-4 border border-line bg-[#f7fbff] px-3 py-2 text-sm text-ink">Publication enregistrée.</p>
        ) : null}
        <label className="grid gap-2 text-sm font-semibold">
          Activité
          <select value={category} onChange={(event) => setCategory(event.target.value as ActivityCategory)} className="field">
            {activityCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-5 grid gap-2 text-sm font-semibold">
          Description de la publication
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={6}
            maxLength={2000}
            required
            className="field min-h-36 resize-y"
            placeholder="Le texte du post. Il ne décrit pas chaque photo séparément."
          />
        </label>
        <label className="mt-5 grid gap-2 text-sm font-semibold">
          Statut
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value === "draft" ? "draft" : "published")}
            className="field"
          >
            <option value="published">Publié</option>
            <option value="draft">Brouillon</option>
          </select>
        </label>
        {error ? (
          <p className="mt-4 border border-danger/30 bg-[#fff1f4] px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary mt-6" disabled={pending || progress != null || slides.length === 0}>
          {pending ? "Enregistrement…" : "Publier"}
        </button>
      </div>
    </form>
  );
}
