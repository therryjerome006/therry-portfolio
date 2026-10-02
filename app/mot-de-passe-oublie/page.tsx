import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/social/AuthForm";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16">
      <div className="w-full">
        <p className="kicker">Compte</p>
        <h1 className="display mt-3 text-4xl text-ink">Réinitialiser</h1>
        <div className="mt-8">
          <AuthForm mode="forgot" next="/" />
        </div>
        <p className="mt-4 text-sm">
          <Link href="/connexion" className="font-semibold text-ink">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
