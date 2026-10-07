"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { articleCategories } from "@/lib/network/constants";
import { createArticle } from "@/lib/actions/network";

export function ArticleForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-4 border border-line bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        start(async () => {
          const result = await createArticle(form);
          if (result.auth) router.push("/connexion?next=/articles/ecrire");
          else if (result.error) setError(result.error);
          else if (result.id) router.push(`/articles/${result.id}`);
        });
      }}
    >
      <label className="grid gap-2 text-sm font-semibold">
        Titre
        <input name="title" required minLength={3} maxLength={120} className="field" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Catégorie
        <select name="category" className="field" defaultValue={articleCategories[0]}>
          {articleCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Tags, séparés par des virgules
        <input name="tags" maxLength={80} className="field" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Couverture
        <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Texte
        <textarea name="body" required minLength={20} maxLength={20000} rows={12} className="field" />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-fit" disabled={pending}>
        {pending ? "Publication…" : "Publier l'article"}
      </button>
    </form>
  );
}
