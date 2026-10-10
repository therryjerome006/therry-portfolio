"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

export function ActionForm({
  action,
  children,
  submit,
  path,
}: {
  action: (formData: FormData) => Promise<{ error?: string; auth?: boolean } | void>;
  children: ReactNode;
  submit: string;
  path: string;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-3"
      action={async (formData) => {
        setPending(true);
        setMessage("");
        const result = await action(formData);
        setPending(false);
        if (result?.auth) setMessage("auth");
        else if (result?.error) setMessage(result.error);
      }}
    >
      {children}
      {message === "auth" ? (
        <p className="text-sm">
          <Link href={`/connexion?next=${encodeURIComponent(path)}`} className="font-semibold text-accent">Connectez-vous</Link> pour continuer.
        </p>
      ) : message ? <p className="text-sm text-danger">{message}</p> : null}
      <button type="submit" className="btn btn-primary w-fit" disabled={pending}>{pending ? "Enregistrement…" : submit}</button>
    </form>
  );
}
