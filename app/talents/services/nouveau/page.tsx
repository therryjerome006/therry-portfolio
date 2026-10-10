import { redirect } from "next/navigation";
import { ServiceForm } from "@/components/talents/forms";
import { loadCategories, loadSkills } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/connexion?next=/talents/services/nouveau");
  const [categories, skills] = await Promise.all([loadCategories(), loadSkills()]);
  return (
    <>
      <h1 className="text-3xl font-bold">Nouveau service</h1>
      <ServiceForm categories={categories.filter((item) => item.active)} skills={skills} />
    </>
  );
}
