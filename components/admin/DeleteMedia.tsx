"use client";

import { removeMedia } from "@/lib/actions/media";

export function DeleteMedia({ id }: { id: string }) {
  return (
    <form
      action={removeMedia}
      onSubmit={(event) => {
        if (!window.confirm("Supprimer cette publication et ses fichiers ? Cette action est définitive.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn h-10 min-h-0 border border-danger/40 bg-white px-3 text-sm text-danger">
        Supprimer
      </button>
    </form>
  );
}
