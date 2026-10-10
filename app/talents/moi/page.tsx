import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PortfolioCard, ServiceCard } from "@/components/talents/Cards";
import { ProfileForm } from "@/components/talents/forms";
import { loadCategories, loadSkills } from "@/lib/talents/queries";
import { profileProgress } from "@/lib/talents/rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyTalentPage({ searchParams }: { searchParams: Promise<{ espace?: string; etat?: string }> }) {
  const query = await searchParams;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect("/connexion?next=/talents/moi");
  const [categories, skills, profileResult, portfolioResult, servicesResult] = await Promise.all([
    loadCategories(),
    loadSkills(),
    supabase.from("talent_profiles").select("display_name, title, bio, availability, languages, status, show_public").eq("user_id", user.id).maybeSingle(),
    supabase.from("portfolio_items").select("id, title, description, origin, status").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("services").select("id, user_id, title, description, category_id, offer_kind, deliverables, price_mode, price_cents, currency, delay_days, revisions, prerequisites, status, published_at, created_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
  ]);
  const profile = profileResult.data;
  const categoryLinks = profile ? (await supabase.from("talent_profile_categories").select("category_id").eq("user_id", user.id)).data ?? [] : [];
  const skillLinks = profile ? (await supabase.from("talent_skills").select("skill_id").eq("user_id", user.id)).data ?? [] : [];
  const progress = profileProgress({
    name: profile?.display_name ?? "",
    title: profile?.title ?? "",
    bio: profile?.bio ?? "",
    categories: categoryLinks.length,
    skills: skillLinks.length,
    availability: profile?.availability ?? "",
    languages: profile?.languages?.length ?? 0,
  });
  const section = query.espace === "portfolio" ? "portfolio" : "profil";
  return (
    <>
      <h1 className="text-3xl font-bold">Mes activités</h1>
      {query.etat === "profil" ? <p className="text-sm">Profil enregistré.</p> : null}
      <p className="text-sm">Profil complété : {progress.done}/{progress.total}. {progress.missing.length > 0 ? `Il reste ${progress.missing.join(", ")}.` : "Les éléments suivis sont remplis."}</p>
      <p className="text-xs text-muted">Le diplôme, l'école, l'adresse et le téléphone ne sont ni demandés ni affichés.</p>
      <div className="flex gap-2">
        <Link href="/talents/moi" className="btn btn-line">Profil</Link>
        <Link href="/talents/moi?espace=portfolio" className="btn btn-line">Portfolio</Link>
        <Link href="/talents/moi/portfolio/nouveau" className="btn btn-primary">Ajouter une réalisation</Link>
      </div>
      {section === "profil" ? (
        <ProfileForm
          categories={categories.filter((item) => item.active)}
          skills={skills}
          initial={profile ? {
            name: profile.display_name,
            title: profile.title,
            bio: profile.bio,
            availability: profile.availability,
            languages: profile.languages ?? [],
            categoryIds: categoryLinks.map((item) => item.category_id),
            skillIds: skillLinks.map((item) => item.skill_id),
          } : undefined}
        />
      ) : portfolioResult.data && portfolioResult.data.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">{portfolioResult.data.map((item) => <li key={item.id}><PortfolioCard item={item} /></li>)}</ul>
      ) : <EmptyState title="Portfolio vide" text="Ajoutez une réalisation. Un brouillon reste visible seulement pour vous." href="/talents/moi/portfolio/nouveau" action="Créer une réalisation" />}
      {servicesResult.data && servicesResult.data.length > 0 ? null : null}
    </>
  );
}
