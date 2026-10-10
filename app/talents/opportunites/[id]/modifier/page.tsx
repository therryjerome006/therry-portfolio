import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OpportunityForm } from "@/components/talents/forms";
import { loadCategories, loadOpportunity, loadSkills } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect(`/connexion?next=/talents/opportunites/${id}/modifier`);
  const item = await loadOpportunity(id);
  if (!item || item.clientId !== user.id) notFound();
  const [categories, skills] = await Promise.all([loadCategories(), loadSkills()]);
  return (
    <>
      <h1 className="text-3xl font-bold">Modifier la mission</h1>
      <OpportunityForm
        categories={categories.filter((entry) => entry.active)}
        skills={skills}
        initial={{
          id: item.id,
          title: item.title,
          description: item.description,
          clientKind: item.clientKind,
          missionType: item.missionType,
          category: item.categoryId,
          deliverables: item.deliverables,
          conditions: item.conditions,
          budgetMode: item.budgetMode,
          price: item.budgetCents ? String(item.budgetCents / 100) : "",
          currency: item.currency,
          duration: item.durationDays,
          seats: item.seats,
          deadline: item.deadline,
          openToMinors: item.openToMinors,
          status: item.status,
        }}
      />
      <Link href={`/talents/opportunites/${item.id}`} className="btn btn-line w-fit">Retour</Link>
    </>
  );
}
