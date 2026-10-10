import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TalentNav } from "@/components/talents/TalentNav";
import { MegaMenu } from "@/components/talents/MegaMenu";
import { paymentNotice } from "@/lib/talents/copy";
import { categoryTree, loadCategories } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "TY Space Talents", robots: { index: false, follow: false } };

export default async function TalentsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const path = (await headers()).get("x-pathname") ?? "";
  const personal = path.startsWith("/talents/moi") || path.startsWith("/talents/favoris") || path.endsWith("/nouveau") || path.endsWith("/modifier");
  if (personal && !user) redirect(`/connexion?next=${encodeURIComponent(path || "/talents/moi")}`);
  const groups = categoryTree(await loadCategories()).map((group) => ({
    parent: { id: group.parent.id, slug: group.parent.slug, name: group.parent.name, description: group.parent.description },
    children: group.children.map((child) => ({ id: child.id, slug: child.slug, name: child.name, description: child.description })),
  }));
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6">
      <TalentNav signedIn={Boolean(user)} path={path} />
      <MegaMenu groups={groups} />
      {children}
      <p className="text-xs leading-5 text-muted">{paymentNotice}</p>
    </div>
  );
}
