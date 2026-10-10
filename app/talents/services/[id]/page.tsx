import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportButton } from "@/components/network/ReportButton";
import { ShareLink } from "@/components/network/ShareLink";
import { OfferPanel } from "@/components/talents/OfferPanel";
import { ServiceRequestForm } from "@/components/talents/forms";
import { toggleFavorite } from "@/lib/actions/talents";
import { paymentNotice } from "@/lib/talents/copy";
import { loadCategories, loadOfferDetails, loadService } from "@/lib/talents/queries";
import { indicativePrice, offerKinds } from "@/lib/talents/rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await loadService(id);
  if (!service) notFound();
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const mine = user?.id === service.userId;
  if (!mine && service.status !== "published") notFound();
  const [offer, categories] = await Promise.all([loadOfferDetails(service.id), loadCategories()]);
  const category = categories.find((item) => item.id === service.categoryId);
  const parent = categories.find((item) => item.id === category?.parentId);
  const kind = offerKinds.find((item) => item.value === service.offerKind)?.label ?? service.offerKind;
  const favorite = user && supabase
    ? await supabase.from("service_favorites").select("service_id").eq("user_id", user.id).eq("service_id", service.id).maybeSingle()
    : { data: null };
  return (
    <article className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-4">
        <p className="text-sm text-muted">
          <Link href="/talents">Talents & Services</Link>
          {parent ? <> · <Link href={`/talents/categories/${parent.slug}`}>{parent.name}</Link></> : null}
          {category ? <> · <Link href={`/talents/categories/${category.slug}`}>{category.name}</Link></> : null}
        </p>
        <h1 className="text-3xl font-bold">{service.title}</h1>
        <p className="text-sm">{kind} · <Link href={`/talents/profil/${service.username}`} className="font-semibold text-accent">{service.name}</Link></p>
        {offer.media[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/talents/fichier?id=${offer.media[0].id}&type=service`} alt={offer.media[0].alt || service.title} className="max-h-80 w-full object-cover" />
        ) : null}
        <p className="text-sm leading-6">{service.description}</p>
        <p className="text-sm">Livrables : {service.deliverables}</p>
        {service.steps ? <p className="text-sm leading-6">Étapes : {service.steps}</p> : null}
        {service.prerequisites ? <p className="text-sm">À fournir : {service.prerequisites}</p> : null}
        <p className="text-xs leading-5 text-muted">{paymentNotice}</p>
      </div>
      <aside className="grid content-start gap-3">
        {offer.packages.length > 0 ? <OfferPanel packages={offer.packages} addons={offer.addons} /> : (
          <p className="border border-line p-4 font-semibold">{indicativePrice(service.priceCents, service.priceMode, service.currency)} · {service.delayDays} jours</p>
        )}
        {user && !mine ? (
          <form action={async (formData) => { await toggleFavorite(formData); }}>
            <input type="hidden" name="kind" value="service" />
            <input type="hidden" name="id" value={service.id} />
            <button className="btn btn-line w-full" type="submit">{favorite.data ? "Retirer des favoris" : "Ajouter aux favoris"}</button>
          </form>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <ShareLink path={`/talents/services/${service.id}`} label="Partager" />
          {mine ? <Link href={`/talents/services/${service.id}/modifier`} className="btn btn-line">Modifier</Link> : null}
        </div>
        {!mine && user ? <ServiceRequestForm serviceId={service.id} /> : null}
        {!user ? <Link href={`/connexion?next=/talents/services/${service.id}`} className="btn btn-primary w-fit">Se connecter pour demander</Link> : null}
        <ReportButton targetType="service" targetId={service.id} path={`/talents/services/${service.id}`} />
      </aside>
    </article>
  );
}
