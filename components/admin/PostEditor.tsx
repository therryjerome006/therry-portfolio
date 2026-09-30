"use client";

import { useActionState, useMemo, useState } from "react";
import { ArticleWriter } from "@/components/admin/editor/ArticleWriter";
import { blogCategories } from "@/data/blog";
import { savePost, type PostFormState } from "@/lib/actions/blog";
import type { BlogPost } from "@/lib/blog/types";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PostEditor({ post, saved = false }: { post?: BlogPost; saved?: boolean }) {
  const [state, action, pending] = useActionState<PostFormState, FormData>(savePost, {});
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [lockedSlug, setLockedSlug] = useState(Boolean(post));
  const [content, setContent] = useState(post?.content ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverUrl, setCoverUrl] = useState(post?.coverImage ?? "");
  const [filePreview, setFilePreview] = useState("");
  const suggested = useMemo(() => slugify(title), [title]);
  const currentSlug = lockedSlug ? slug : slug || suggested;
  const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
  const minutes = Math.max(1, Math.round(words / 200));
  const cover = filePreview || coverUrl;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <input type="hidden" name="originalSlug" value={post?.slug ?? ""} />

      <div className="grid content-start gap-4">
        {saved ? (
          <p className="border border-[#166534]/30 bg-[#e8f6ec] px-3 py-2 text-sm text-ok" role="status">
            Article enregistré.
          </p>
        ) : null}
        {state.error ? (
          <p className="border border-danger/30 bg-[#fff1f4] px-3 py-2 text-sm text-danger" role="alert">
            {state.error}
          </p>
        ) : null}

        <label className="grid gap-2 text-sm font-semibold">
          Titre
          <input
            name="title"
            value={title}
            onChange={(event) => {
              const next = event.target.value;
              setTitle(next);
              if (!lockedSlug) setSlug(slugify(next));
            }}
            className="field text-lg font-bold"
            placeholder="Le titre de l'article"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Adresse
          <input
            name="slug"
            value={currentSlug}
            onChange={(event) => {
              setLockedSlug(true);
              setSlug(slugify(event.target.value));
            }}
            className="field font-mono text-sm"
            required
          />
          <span className="font-mono text-xs font-normal text-muted">/blog/{currentSlug || "slug"}</span>
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Résumé
          <textarea
            name="excerpt"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            rows={3}
            className="field"
            placeholder="Quelques lignes pour la carte de l'article."
            required
          />
          <span className="text-xs font-normal text-muted">{excerpt.trim().length} caractères</span>
        </label>

        <div>
          <ArticleWriter initial={post?.content ?? ""} onChange={setContent} />
          <input type="hidden" name="content" value={content} />
          <p className="mt-2 font-mono text-xs text-muted">
            {words} mots · {words ? minutes : 0} min de lecture
          </p>
        </div>
      </div>

      <aside className="grid content-start gap-4 border-[3px] border-[#12263f] bg-white p-4 sm:p-5">
        <p className="kicker">Publication</p>
        <div className="grid gap-3">
          <button type="submit" name="status" value="published" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Enregistrement…" : "Publier"}
          </button>
          <button type="submit" name="status" value="draft" className="btn btn-line w-full" disabled={pending}>
            Enregistrer en brouillon
          </button>
        </div>

        <label className="grid gap-2 text-sm font-semibold">
          Image de couverture
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="aspect-[16/9] w-full border border-line object-cover" />
          ) : (
            <div className="grid aspect-[16/9] place-items-center border border-dashed border-line bg-[#f7fbff] text-xs text-muted">
              Aucune image
            </div>
          )}
          <input
            name="coverImage"
            value={coverUrl}
            onChange={(event) => setCoverUrl(event.target.value)}
            className="field font-mono text-xs"
            placeholder="/blog/covers/mon-image.jpg"
          />
          <input
            name="coverFile"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="text-sm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFilePreview(file ? URL.createObjectURL(file) : "");
            }}
          />
          <span className="text-xs font-normal text-muted">PNG, JPG, WEBP ou SVG. 2 Mo maximum.</span>
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Catégorie
          <select name="category" defaultValue={post?.category ?? "Development"} className="field">
            {blogCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Date de publication
          <input name="publishedAt" type="datetime-local" defaultValue={toLocalInput(post?.publishedAt ?? null)} className="field" />
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Tags
          <input name="tags" defaultValue={post?.tags.join(", ") ?? ""} className="field" placeholder="Next.js, React" />
          <span className="text-xs font-normal text-muted">Séparez les tags par des virgules. Huit maximum.</span>
        </label>

        <label className="flex items-start gap-3 border border-line bg-[#f7fbff] p-3 text-sm">
          <input type="checkbox" name="featured" defaultChecked={post?.featured ?? false} className="mt-1" />
          <span>
            <span className="block font-semibold">Article à la une</span>
            <span className="mt-1 block text-muted">Mis en avant sur la page du blog.</span>
          </span>
        </label>
      </aside>
    </form>
  );
}
