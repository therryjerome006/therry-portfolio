import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MegaMenu } from "@/components/talents/MegaMenu";
import { TalentNav } from "@/components/talents/TalentNav";
import { paymentNotice } from "@/lib/talents/copy";
import { categoryTree, loadCategories } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Talents", robots: { index: false, follow: false } };

export default async function TalentsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const path = (await headers()).get("x-pathname") ?? "";
  const personal = path.startsWith("/talents/moi") || path.startsWith("/talents/favoris") || path.endsWith("/nouveau") || path.endsWith("/modifier");
  if (personal && !user) redirect(`/connexion?next=${encodeURIComponent(path || "/talents/moi")}`);
  const groups = categoryTree(await loadCategories()).map((group) => ({
    parent: { id: group.parent.id, slug: group.parent.slug, name: group.parent.name },
    children: group.children.map((child) => ({ id: child.id, slug: child.slug, name: child.name })),
  }));
  return (
    <div className="market">
      <header className="market-top">
        <div className="market-bar">
          <Link href="/talents" className="market-logo">talents<span>.</span></Link>
          <form className="market-search" action="/talents/recherche">
            <label className="sr-only" htmlFor="market-q">Recherche</label>
            <input id="market-q" name="q" placeholder="Quel service cherchez-vous aujourd'hui ?" />
            <button type="submit" aria-label="Rechercher">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </form>
          <nav className="market-tools" aria-label="Compte marketplace">
            <Link href="/">Communauté</Link>
            <Link href="/talents/favoris" aria-label="Favoris">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z" stroke="currentColor" strokeWidth="1.8" /></svg>
            </Link>
            <Link href="/talents/opportunites" aria-label="Projets">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 7V5h8v2" stroke="currentColor" strokeWidth="1.8" /></svg>
            </Link>
            {user ? <Link href="/talents/moi">Mon espace</Link> : <Link href="/connexion?next=/talents">Connexion</Link>}
          </nav>
        </div>
        <MegaMenu groups={groups} />
      </header>
      <div className="market-wrap">
        {path.startsWith("/talents/moi") ? <TalentNav signedIn path={path} /> : null}
        {children}
      </div>
      <p className="market-foot">{paymentNotice}</p>
    </div>
  );
}
