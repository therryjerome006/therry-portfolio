import { notFound, redirect } from "next/navigation";
import { deletePortfolio } from "@/lib/actions/talents";
import { ActionForm } from "@/components/talents/ActionForm";
import { PortfolioForm } from "@/components/talents/forms";
import { loadCategories, loadSkills } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect(`/connexion?next=/talents/moi/portfolio/${id}`);
  const { data } = await supabase.from("portfolio_items").select("id, user_id, title, description, origin, role_label, period_label, external_url, category_id, status").eq("id", id).maybeSingle();
  if (!data || data.user_id !== user.id) notFound();
  const [categories, skills, media] = await Promise.all([
    loadCategories(),
    loadSkills(),
    supabase.from("portfolio_media").select("id").eq("item_id", id),
  ]);
  return (
    <>
      <h1 className="text-3xl font-bold">Modifier la réalisation</h1>
      <p className="text-sm text-muted">{media.data?.length ?? 0} image(s) enregistrée(s). L'aperçu public suit le statut publié.</p>
      <PortfolioForm
        id={id}
        categories={categories.filter((item) => item.active)}
        skills={skills}
        initial={{
          title: data.title,
          description: data.description,
          origin: data.origin,
          role: data.role_label,
          period: data.period_label,
          url: data.external_url,
          category: data.category_id ?? "",
          status: data.status,
        }}
      />
      <ActionForm action={deletePortfolio} submit="Supprimer définitivement" path={`/talents/moi/portfolio/${id}`}>
        <input type="hidden" name="id" value={id} />
        <label className="grid gap-1 text-sm font-semibold">Écrivez supprimer pour confirmer<input name="confirm" className="field" /></label>
      </ActionForm>
    </>
  );
}
