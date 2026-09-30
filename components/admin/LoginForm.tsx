"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";

export function LoginForm({ next, configured }: { next?: string; configured: boolean }) {
  const [state, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="grid gap-5 border-[3px] border-[#12263f] bg-white p-6">
      <input type="hidden" name="next" value={next ?? "/admin/blog"} />
      {!configured ? (
        <p className="border border-line bg-[#f7fbff] px-3 py-2 text-sm leading-6 text-muted">
          Ajoutez <code className="inline-code">ADMIN_PASSWORD</code> dans <code className="inline-code">.env.local</code>, puis redémarrez le serveur.
        </p>
      ) : null}
      <label htmlFor="password" className="grid gap-2 text-sm font-semibold">
        Mot de passe
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="field"
          required
        />
      </label>
      {state?.error ? (
        <p className="border border-danger/30 bg-[#fff1f4] px-3 py-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending || !configured}>
        {pending ? "Connexion…" : "Entrer dans l'administration"}
      </button>
    </form>
  );
}
