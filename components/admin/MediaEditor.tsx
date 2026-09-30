"use client";

import { useActionState, useMemo, useState } from "react";
import { saveMedia, type MediaFormState } from "@/lib/actions/media";
import {
  IMAGE_MAX_BYTES,
  THUMBNAIL_MAX_BYTES,
  VIDEO_MAX_BYTES,
  mediaCategories,
  mediaTypeLabels,
  mediaTypes,
  type MediaType,
  type UploadKind,
} from "@/lib/media/constants";
import { formatBytes, formatDuration } from "@/lib/media/format";
import { slugify } from "@/lib/media/slug";
import type { MediaDraftItem, MediaPost } from "@/lib/media/types";
import { validateUpload } from "@/lib/media/validate";

type EditorItem = MediaDraftItem & { key: string; preview: string };

type Uploaded = {
  url: string;
  bucket: string;
  storagePath: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
};

function dateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function uploadFile(file: File, kind: UploadKind, onProgress: (value: number) => void) {
  return new Promise<Uploaded>((resolve, reject) => {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/media/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      const payload = JSON.parse(xhr.responseText || "{}") as Uploaded & { error?: string };
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
      else reject(new Error(payload.error || "Envoi impossible."));
    };
    xhr.onerror = () => reject(new Error("Envoi impossible."));
    xhr.send(body);
  });
}

async function sniff(file: File, kind: UploadKind) {
  const header = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  return validateUpload(header, kind, file.size);
}

async function measure(file: File, kind: "image" | "video") {
  const url = URL.createObjectURL(file);
  try {
    if (kind === "image") {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Image illisible."));
        image.src = url;
      });
      return { width: image.naturalWidth, height: image.naturalHeight, durationSeconds: null as number | null };
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Vidéo illisible."));
      video.src = url;
    });
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function externalItem(url: string): EditorItem | string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Collez une adresse YouTube ou Vimeo.";
  }
  const host = parsed.hostname.replace(/^www\./, "");
  const key = crypto.randomUUID();
  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    return {
      key,
      preview: "",
      kind: "youtube",
      url,
      thumbnailUrl: "",
      alt: "",
      caption: "",
      fileName: "YouTube",
      fileSize: null,
      width: null,
      height: null,
      durationSeconds: null,
      mimeType: "video/youtube",
      bucket: "",
      storagePath: "",
    };
  }
  if (host.endsWith("vimeo.com")) {
    return {
      key,
      preview: "",
      kind: "vimeo",
      url,
      thumbnailUrl: "",
      alt: "",
      caption: "",
      fileName: "Vimeo",
      fileSize: null,
      width: null,
      height: null,
      durationSeconds: null,
      mimeType: "video/vimeo",
      bucket: "",
      storagePath: "",
    };
  }
  return "Collez une adresse YouTube ou Vimeo.";
}

function fromPost(post?: MediaPost): EditorItem[] {
  return (
    post?.items.map((item) => ({
      key: item.id,
      preview: item.kind === "image" ? item.url : item.thumbnailUrl,
      kind: item.kind,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      alt: item.alt,
      caption: item.caption,
      fileName: item.fileName,
      fileSize: item.fileSize,
      width: item.width,
      height: item.height,
      durationSeconds: item.durationSeconds,
      mimeType: item.mimeType,
      bucket: item.bucket,
      storagePath: item.storagePath,
    })) ?? []
  );
}

export function MediaEditor({ post, saved = false }: { post?: MediaPost; saved?: boolean }) {
  const [state, action, pending] = useActionState<MediaFormState, FormData>(saveMedia, {});
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [lockedSlug, setLockedSlug] = useState(Boolean(post));
  const [items, setItems] = useState<EditorItem[]>(() => fromPost(post));
  const [progress, setProgress] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");
  const suggested = useMemo(() => slugify(title), [title]);
  const currentSlug = lockedSlug ? slug : slug || suggested;
  const payload = JSON.stringify(
    items.map(({ preview: _preview, key: _key, ...item }) => item),
  );

  async function addFiles(list: FileList | null, kind: UploadKind, replaceKey?: string) {
    if (!list?.length) return;
    setNotice("");
    const files = [...list];
    for (const file of files) {
      const checked = await sniff(file, kind);
      if (typeof checked === "string") {
        setNotice(checked);
        continue;
      }
      setProgress(0);
      try {
        const measured =
          kind === "video" ? await measure(file, "video").catch(() => null) : await measure(file, "image").catch(() => null);
        const uploaded = await uploadFile(file, kind, setProgress);
        const preview = kind === "video" ? "" : URL.createObjectURL(file);
        if (kind === "thumbnail" && replaceKey) {
          setItems((current) =>
            current.map((item) => (item.key === replaceKey ? { ...item, thumbnailUrl: uploaded.url, preview: preview || item.preview } : item)),
          );
        } else if (replaceKey) {
          setItems((current) =>
            current.map((item) =>
              item.key === replaceKey
                ? {
                    ...item,
                    kind: kind === "video" ? "video" : "image",
                    url: uploaded.url,
                    bucket: uploaded.bucket,
                    storagePath: uploaded.storagePath,
                    mimeType: uploaded.mimeType,
                    fileName: uploaded.fileName,
                    fileSize: uploaded.fileSize,
                    preview: preview || item.preview,
                    width: measured?.width ?? item.width,
                    height: measured?.height ?? item.height,
                    durationSeconds: measured?.durationSeconds ?? item.durationSeconds,
                  }
                : item,
            ),
          );
        } else {
          setItems((current) => [
            ...current,
            {
              key: crypto.randomUUID(),
              preview,
              kind: kind === "video" ? "video" : "image",
              url: uploaded.url,
              thumbnailUrl: "",
              alt: "",
              caption: "",
              fileName: uploaded.fileName,
              fileSize: uploaded.fileSize,
              width: measured?.width ?? null,
              height: measured?.height ?? null,
              durationSeconds: measured?.durationSeconds ?? null,
              mimeType: uploaded.mimeType,
              bucket: uploaded.bucket,
              storagePath: uploaded.storagePath,
            },
          ]);
        }
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Envoi impossible.");
      } finally {
        setProgress(null);
      }
    }
  }

  async function removeItem(item: EditorItem) {
    setItems((current) => current.filter((entry) => entry.key !== item.key));
    if (!post && item.url.startsWith("http")) {
      await fetch("/api/admin/media/object", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: item.url }),
      });
    }
  }

  function move(index: number, direction: -1 | 1) {
    setItems((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [row] = next.splice(index, 1);
      if (!row) return current;
      next.splice(target, 0, row);
      return next;
    });
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="items" value={payload} />
      <div className="grid content-start gap-4">
        {saved ? (
          <p className="border border-[#166534]/30 bg-[#e8f6ec] px-3 py-2 text-sm text-ok" role="status">
            Publication enregistrée.
          </p>
        ) : null}
        {state.error ? (
          <p className="border border-danger/30 bg-[#fff1f4] px-3 py-2 text-sm text-danger" role="alert">
            {state.error}
          </p>
        ) : null}
        {notice ? (
          <p className="border border-danger/30 bg-[#fff1f4] px-3 py-2 text-sm text-danger" role="alert">
            {notice}
          </p>
        ) : null}

        <label className="grid gap-2 text-sm font-semibold">
          Titre
          <input name="title" value={title} onChange={(event) => {
            const next = event.target.value;
            setTitle(next);
            if (!lockedSlug) setSlug(slugify(next));
          }} className="field text-lg font-bold" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Adresse
          <input name="slug" value={currentSlug} onChange={(event) => {
            setLockedSlug(true);
            setSlug(slugify(event.target.value));
          }} className="field" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Description
          <textarea name="description" defaultValue={post?.description ?? ""} rows={4} className="field" />
        </label>

        <div className="border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold">Médias</p>
            <label className="btn btn-primary h-10 min-h-0 cursor-pointer px-3">
              Ajouter des fichiers
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.avif,.mp4,.webm"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const selected = [...(event.target.files ?? [])];
                  event.target.value = "";
                  void (async () => {
                    for (const file of selected) {
                      const transfer = new DataTransfer();
                      transfer.items.add(file);
                      await addFiles(transfer.files, file.type.startsWith("video/") ? "video" : "image");
                    }
                  })();
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted">
            Images jusqu&apos;à {IMAGE_MAX_BYTES / (1024 * 1024)} Mo. Vidéos jusqu&apos;à {VIDEO_MAX_BYTES / (1024 * 1024)} Mo. JPG, PNG, WebP, AVIF, MP4, WebM.
          </p>
          {progress != null ? (
            <div className="mt-3" aria-live="polite">
              <p className="text-xs font-semibold">Envoi… {Math.round(progress * 100)}%</p>
              <div className="mt-1 h-2 bg-[#e7eef8]">
                <div className="h-full bg-[#1d6fe8]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Lien YouTube ou Vimeo" className="field min-w-0 flex-1" />
            <button
              type="button"
              className="btn btn-line h-10 min-h-0 px-3"
              onClick={() => {
                const next = externalItem(link.trim());
                if (typeof next === "string") setNotice(next);
                else {
                  setItems((current) => [...current, next]);
                  setLink("");
                  setNotice("");
                }
              }}
            >
              Ajouter le lien
            </button>
          </div>
          <ul className="mt-4 grid gap-3">
            {items.map((item, index) => (
              <li key={item.key} className="grid gap-3 border border-line p-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <div className="bg-[#e7eef8]">
                  {item.preview || item.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.preview || item.url} alt="" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="grid aspect-square place-items-center text-xs font-bold uppercase">{item.kind}</div>
                  )}
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-bold">{item.fileName || item.kind}</p>
                  <p className="text-xs text-muted">
                    {[item.kind, formatBytes(item.fileSize), item.width && item.height ? `${item.width}×${item.height}` : "", formatDuration(item.durationSeconds)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <input
                    value={item.alt}
                    onChange={(event) => setItems((current) => current.map((row) => (row.key === item.key ? { ...row, alt: event.target.value } : row)))}
                    placeholder="Texte alternatif"
                    className="field"
                  />
                  <input
                    value={item.caption}
                    onChange={(event) => setItems((current) => current.map((row) => (row.key === item.key ? { ...row, caption: event.target.value } : row)))}
                    placeholder="Légende"
                    className="field"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-line h-9 min-h-0 px-2 text-xs" onClick={() => move(index, -1)}>
                      Monter
                    </button>
                    <button type="button" className="btn btn-line h-9 min-h-0 px-2 text-xs" onClick={() => move(index, 1)}>
                      Descendre
                    </button>
                    {item.kind === "image" || item.kind === "video" ? (
                      <label className="btn btn-line h-9 min-h-0 cursor-pointer px-2 text-xs">
                        Remplacer
                        <input
                          type="file"
                          accept={item.kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
                          className="sr-only"
                          onChange={(event) => {
                            void addFiles(event.target.files, item.kind === "video" ? "video" : "image", item.key);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    ) : null}
                    {item.kind === "video" ? (
                      <label className="btn btn-line h-9 min-h-0 cursor-pointer px-2 text-xs">
                        Miniature
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="sr-only"
                          onChange={(event) => {
                            void addFiles(event.target.files, "thumbnail", item.key);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    ) : null}
                    <button type="button" className="btn h-9 min-h-0 border border-danger/40 px-2 text-xs text-danger" onClick={() => void removeItem(item)}>
                      Retirer
                    </button>
                  </div>
                  {item.kind === "video" ? (
                    <p className="text-xs text-muted">Miniature : {THUMBNAIL_MAX_BYTES / (1024 * 1024)} Mo maximum.</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <label className="grid gap-2 text-sm font-semibold">
          Type
          <select name="type" defaultValue={post?.type ?? "photo"} className="field">
            {mediaTypes.map((type) => (
              <option key={type} value={type}>
                {mediaTypeLabels[type as MediaType]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Catégorie
          <select name="category" defaultValue={post?.category ?? mediaCategories[0]} className="field">
            {mediaCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Tags
          <input name="tags" defaultValue={post?.tags.join(", ") ?? ""} placeholder="dashboard, achatplus" className="field" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Date
          <input name="publishedAt" type="date" defaultValue={dateInput(post?.publishedAt ?? null)} className="field" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Statut
          <select name="status" defaultValue={post?.status ?? "draft"} className="field">
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Article du blog
          <input name="articlePath" defaultValue={post?.articlePath ?? ""} placeholder="/blog/mon-article" className="field" />
        </label>
        <button type="submit" className="btn btn-primary" disabled={pending || progress != null}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </aside>
    </form>
  );
}
