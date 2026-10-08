"use client";

import { useState } from "react";

export function ShareLink({ path, label }: { path: string; label: string }) {
  const [note, setNote] = useState("");
  return (
    <span>
      <button
        type="button"
        className="btn btn-line h-10 min-h-0 px-3"
        onClick={async () => {
          const url = `${window.location.origin}${path}`;
          if (navigator.share) {
            await navigator.share({ url }).catch(() => undefined);
            return;
          }
          await navigator.clipboard.writeText(url);
          setNote("Lien copié.");
        }}
      >
        {label}
      </button>
      {note ? <span className="ml-2 text-xs text-muted">{note}</span> : null}
    </span>
  );
}
