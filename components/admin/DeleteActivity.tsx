"use client";

import { removeActivity } from "@/lib/actions/activities";

export function DeleteActivity({ id }: { id: string }) {
  return (
    <form
      action={removeActivity}
      onSubmit={(event) => {
        if (!window.confirm("Supprimer cette publication et son fichier ? Cette action est définitive.")) {
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
