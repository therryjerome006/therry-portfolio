"use client";

import { deletePost } from "@/lib/actions/blog";

export function DeletePost({ slug }: { slug: string }) {
  return (
    <form
      action={deletePost}
      onSubmit={(event) => {
        if (!window.confirm("Supprimer cet article ? Cette action est définitive.")) event.preventDefault();
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className="btn h-10 min-h-0 border border-danger/40 bg-white px-3 text-sm text-danger">
        Supprimer
      </button>
    </form>
  );
}
