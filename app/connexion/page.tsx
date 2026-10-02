import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/social/AuthForm";
import { safeNext } from "@/lib/social/content";

export const metadata: Metadata = { title: "Connexion", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeNext(params.next);
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16">
      <div className="w-full">
        <p className="kicker">Compte</p>
        <h1 className="display mt-3 text-4xl text-ink">Connexion</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Le site reste lisible sans compte. La connexion sert à aimer et commenter.</p>
        <div className="mt-8">
          <AuthForm mode="login" next={next} />
        </div>
        <p className="mt-4 text-sm text-muted">
          <Link href={`/inscription?next=${encodeURIComponent(next)}`} className="font-semibold text-ink">
            Créer un compte
          </Link>
          {" · "}
          <Link href="/mot-de-passe-oublie" className="font-semibold text-ink">
            Mot de passe oublié
          </Link>
        </p>
      </div>
    </main>
  );
}
