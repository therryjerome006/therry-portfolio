import type { ReactNode } from "react";
import { StudioNav } from "@/components/admin/studio/StudioNav";
import { requireAdmin } from "@/lib/auth/session";

export default async function StudioLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-accent">Administration</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">Studio de contenu</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Préparez les publications des profils officiels de TY Space, puis diffusez-les progressivement. Ces profils ne sont pas des comptes de membres.
        </p>
      </div>
      <StudioNav />
      {children}
    </div>
  );
}
