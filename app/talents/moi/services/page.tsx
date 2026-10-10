import Link from "next/link";
import { redirect } from "next/navigation";
import { ServiceCard } from "@/components/talents/Cards";
import { serviceStatusLabels } from "@/lib/talents/copy";
import { loadCategories } from "@/lib/talents/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyServicesPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect("/connexion?next=/talents/moi/services");
  const { data } = await supabase.from("services").select("id, user_id, title, description, category_id, offer_kind, deliverables, price_mode, price_cents, currency, delay_days, revisions, prerequisites, status, published_at, created_at").eq("user_id", user.id).order("updated_at", { ascending: false });
  const categories = await loadCategories();
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Mes services</h1>
        <Link href="/talents/services/nouveau" className="btn btn-primary">Nouveau</Link>
      </div>
      {(data ?? []).length === 0 ? <p className="text-sm text-muted">Aucun service enregistré.</p> : (
        <ul className="grid gap-3">
          {(data ?? []).map((row) => (
            <li key={row.id} className="grid gap-2">
              <ServiceCard service={{
                id: row.id,
                userId: row.user_id,
                username: "",
                name: "",
                avatarUrl: "",
                title: row.title,
                description: row.description,
                category: categories.find((item) => item.id === row.category_id)?.name ?? "",
                categoryId: row.category_id,
                offerKind: row.offer_kind,
                deliverables: row.deliverables,
                priceMode: row.price_mode === "indicatif" ? "indicatif" : "convenir",
                priceCents: row.price_cents,
                currency: row.currency,
                delayDays: row.delay_days,
                revisions: row.revisions,
                prerequisites: row.prerequisites,
                steps: "",
                status: row.status,
                publishedAt: row.published_at ?? row.created_at,
                coverId: "",
              }} />
              <p className="text-xs text-muted">{serviceStatusLabels[row.status] ?? row.status}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
