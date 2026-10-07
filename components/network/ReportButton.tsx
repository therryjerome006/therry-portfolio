"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { reportReasons } from "@/lib/network/constants";
import { reportContent } from "@/lib/actions/network";

export function ReportButton({ targetType, targetId, path }: { targetType: string; targetId: string; path: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const next = encodeURIComponent(path);

  if (!open) {
    return (
      <button type="button" className="text-xs font-semibold text-muted" onClick={() => setOpen(true)}>
        Signaler
      </button>
    );
  }

  return (
    <form
      className="grid gap-2 border border-line bg-[#f7fbff] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        start(async () => {
          const result = await reportContent(targetType, targetId, String(form.get("reason") ?? ""), String(form.get("note") ?? ""));
          if (result.auth) setMessage("auth");
          else if (result.error) setMessage(result.error);
          else setMessage("Signalement envoyé. Merci.");
        });
      }}
    >
      <label className="grid gap-1 text-xs font-semibold">
        Motif
        <select name="reason" className="field" defaultValue="spam">
          {reportReasons.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </label>
      <textarea name="note" maxLength={280} rows={2} className="field" placeholder="Précision facultative" />
      {message === "auth" ? (
        <p className="text-sm">
          <Link href={`/connexion?next=${next}`} className="font-semibold text-ink">
            Connectez-vous
          </Link>{" "}
          pour signaler.
        </p>
      ) : message ? (
        <p className="text-sm text-ink">{message}</p>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary h-10 min-h-0 px-3" disabled={pending}>
          Envoyer
        </button>
        <button type="button" className="btn btn-line h-10 min-h-0 px-3" onClick={() => setOpen(false)}>
          Annuler
        </button>
      </div>
    </form>
  );
}
