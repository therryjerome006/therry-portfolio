import { notFound, redirect } from "next/navigation";
import { ServiceForm } from "@/components/talents/forms";
import { loadCategories, loadService, loadSkills } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect(`/connexion?next=/talents/services/${id}/modifier`);
  const service = await loadService(id);
  if (!service || service.userId !== user.id) notFound();
  const [categories, skills] = await Promise.all([loadCategories(), loadSkills()]);
  return (
    <>
      <h1 className="text-3xl font-bold">Modifier le service</h1>
      <ServiceForm
        categories={categories.filter((item) => item.active)}
        skills={skills}
        initial={{
          id: service.id,
          title: service.title,
          description: service.description,
          category: service.categoryId,
          offerKind: service.offerKind,
          deliverables: service.deliverables,
          prerequisites: service.prerequisites,
          priceMode: service.priceMode,
          price: service.priceCents ? String(service.priceCents / 100) : "",
          currency: service.currency,
          delay: service.delayDays,
          revisions: service.revisions,
          status: service.status === "suspended" ? "draft" : service.status,
        }}
      />
    </>
  );
}
