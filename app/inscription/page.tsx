import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/social/AuthForm";
import { safeNext } from "@/lib/social/content";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false, follow: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16">
      <div className="w-full">
        <p className="kicker">Compte</p>
        <h1 className="display mt-3 text-4xl text-ink">Créer un compte</h1>
        <p className="mt-3 text-sm leading-6 text-muted">TY Space s&apos;adresse aux 12–22 ans. L&apos;e-mail, le téléphone et la date de naissance complète ne sont pas affichés.</p>
        <div className="mt-8">
          <AuthForm mode="signup" next={next} />
        </div>
        <p className="mt-4 text-sm text-muted">
          <Link href={`/connexion?next=${encodeURIComponent(next)}`} className="font-semibold text-ink">
            Déjà un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
