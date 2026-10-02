"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { safeNext } from "@/lib/social/content";

export function AuthForm({ mode, next }: { mode: "login" | "signup" | "forgot"; next: string }) {
  const router = useRouter();
  const destination = safeNext(next);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = browserClient();
    if (!supabase) {
      setError("La connexion n'est pas disponible.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    setPending(true);
    setError("");
    setInfo("");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;

    if (mode === "forgot") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/compte/mot-de-passe")}`,
      });
      setPending(false);
      if (resetError) setError("L'e-mail de réinitialisation n'a pas pu être envoyé.");
      else setInfo("Si ce compte existe, un e-mail de réinitialisation a été envoyé.");
      return;
    }

    if (mode === "signup") {
      const { data, error: signError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo, data: { display_name: displayName || "Visiteur" } },
      });
      setPending(false);
      if (signError) {
        setError("Le compte n'a pas pu être créé. Vérifiez l'e-mail et utilisez au moins 8 caractères.");
        return;
      }
      if (data.session) {
        router.push(destination);
        router.refresh();
        return;
      }
      setInfo("Compte créé. Ouvrez l'e-mail de vérification, puis connectez-vous.");
      return;
    }

    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signError) {
      setError("E-mail ou mot de passe incorrect, ou adresse pas encore vérifiée.");
      return;
    }
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 border-[3px] border-[#12263f] bg-white p-6">
      {mode === "signup" ? (
        <label className="grid gap-2 text-sm font-semibold">
          Nom affiché
          <input name="displayName" required maxLength={40} className="field" autoComplete="nickname" />
        </label>
      ) : null}
      <label className="grid gap-2 text-sm font-semibold">
        E-mail
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      {mode === "forgot" ? null : (
        <label className="grid gap-2 text-sm font-semibold">
          Mot de passe
          <input name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="field" />
        </label>
      )}
      {error ? <p className="border border-danger/30 bg-[#fff1f4] px-3 py-2 text-sm text-danger">{error}</p> : null}
      {info ? <p className="border border-line bg-[#f7fbff] px-3 py-2 text-sm text-ink">{info}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Patientez…" : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer le compte" : "Envoyer le lien"}
      </button>
    </form>
  );
}
