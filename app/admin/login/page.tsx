import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { profile } from "@/data/profile";
import { adminAccountSignedIn } from "@/lib/auth/owner";
import { adminAccess } from "@/lib/auth/session";
import { safeAdminNext } from "@/lib/auth/token";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await adminAccess()) redirect("/admin/blog");
  const accountReady = await adminAccountSignedIn();
  const params = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r-[3px] border-[#12263f] bg-[#e4edf8] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <p className="kicker">Espace privé</p>
        <div>
          <h1 className="display max-w-md text-5xl text-ink">{profile.name}</h1>
          <p className="mt-4 max-w-sm text-lg font-semibold leading-8 text-[#12263f]">
            Rédigez, corrigez et publiez vos articles. Les brouillons restent hors du site public.
          </p>
        </div>
        <div className="term max-w-md">
          <div className="term-bar">
            <span className="term-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            admin.ts
          </div>
          <div className="term-body pb-4">
            <p>
              <span className="term-prompt">› </span>
              <span className="term-kw">statut</span> brouillon
            </p>
            <p>
              <span className="term-prompt">› </span>
              <span className="term-kw">visible</span> <span className="term-str">&quot;après publication&quot;</span>
            </p>
            <p>
              <span className="term-prompt">› </span>
              session<span className="caret">_</span>
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-16 sm:px-8">
        <div className="w-full max-w-md">
          <p className="kicker lg:hidden">Espace privé</p>
          <h2 className="display mt-3 text-4xl text-ink lg:mt-0">Connexion</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Le mot de passe n&apos;ouvre l&apos;administration que si la session est celle du compte administrateur.
          </p>
          <div className="mt-8">
            <LoginForm next={safeAdminNext(params.next)} configured={Boolean(process.env.ADMIN_PASSWORD)} accountReady={accountReady} />
          </div>
        </div>
      </section>
    </div>
  );
}
