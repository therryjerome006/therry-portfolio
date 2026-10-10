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
            <button type="submit">Rechercher un service</button>
          </form>
          <nav className="market-tools" aria-label="Compte marketplace">
            <Link href="/">Retourner à la communauté</Link>
            <Link href="/talents/favoris">Ouvrir mes favoris</Link>
            <Link href="/talents/opportunites">Voir les projets</Link>
            {user ? <Link href="/talents/moi">Ouvrir mon espace</Link> : <Link href="/connexion?next=/talents">Se connecter</Link>}
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
