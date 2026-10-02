"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

export function PasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = browserClient();
    if (!supabase) {
      setError("La connexion n'est pas disponible.");
      return;
    }
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError("Le mot de passe n'a pas pu être changé. Ouvrez à nouveau le lien reçu par e-mail.");
      return;
    }
    router.push("/profil");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 border-[3px] border-[#12263f] bg-white p-6">
      <label className="grid gap-2 text-sm font-semibold">
        Nouveau mot de passe
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
