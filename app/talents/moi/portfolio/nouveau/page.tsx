import { redirect } from "next/navigation";
import { PortfolioForm } from "@/components/talents/forms";
import { loadCategories, loadSkills } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewPortfolioPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/connexion?next=/talents/moi/portfolio/nouveau");
  const [categories, skills] = await Promise.all([loadCategories(), loadSkills()]);
  return (
    <>
      <h1 className="text-3xl font-bold">Nouvelle réalisation</h1>
      <PortfolioForm categories={categories.filter((item) => item.active)} skills={skills} />
    </>
  );
}
