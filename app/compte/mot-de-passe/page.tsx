import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/social/PasswordForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false, follow: false } };

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/connexion?next=/compte/mot-de-passe");

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16">
      <div className="w-full">
        <p className="kicker">Compte</p>
        <h1 className="display mt-3 text-4xl text-ink">Nouveau mot de passe</h1>
        <div className="mt-8">
          <PasswordForm />
        </div>
      </div>
    </main>
  );
}
