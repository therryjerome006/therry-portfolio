import { redirect } from "next/navigation";
import { OpportunityForm } from "@/components/talents/forms";
import { loadCategories, loadSkills } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/connexion?next=/talents/opportunites/nouveau");
  const [categories, skills] = await Promise.all([loadCategories(), loadSkills()]);
  return (
    <>
      <h1 className="text-3xl font-bold">Nouvelle mission</h1>
      <OpportunityForm categories={categories.filter((item) => item.active)} skills={skills} />
    </>
  );
}
