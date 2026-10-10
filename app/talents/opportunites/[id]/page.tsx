import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportButton } from "@/components/network/ReportButton";
import { ShareLink } from "@/components/network/ShareLink";
import { ApplicationForm } from "@/components/talents/forms";
import { setApplicationStatus } from "@/lib/actions/talents";
import { ActionForm } from "@/components/talents/ActionForm";
import { applicationStatusLabels, paymentNotice } from "@/lib/talents/copy";
import { loadOpportunity } from "@/lib/talents/queries";
import { clientKinds, indicativePrice, missionTypes } from "@/lib/talents/rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ etat?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const item = await loadOpportunity(id);
  if (!item) notFound();
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const mine = user?.id === item.clientId;
  if (!mine && item.status !== "published" && item.status !== "closed") notFound();
  const works = user && supabase
    ? (await supabase.from("portfolio_items").select("id, title").eq("user_id", user.id).eq("status", "published")).data ?? []
    : [];
  const applications = mine && supabase
    ? (await supabase.from("applications").select("id, pitch, status, user_id, price_cents, price_mode, delay_days").eq("opportunity_id", id)).data ?? []
    : [];
  const type = missionTypes.find((entry) => entry.value === item.missionType)?.label ?? item.missionType;
  const kind = clientKinds.find((entry) => entry.value === item.clientKind)?.label ?? item.clientKind;
  return (
    <article className="grid gap-4">
      <div className="panel grid gap-3 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#0d7494]">{item.category} · {type}</p>
        <h1 className="text-3xl font-bold">{item.title}</h1>
        {query.etat === "verification" ? <p className="text-sm">Cette mission est en vérification. Elle n'est pas encore visible comme opportunité admissible.</p> : null}
        {item.changeSummary ? <p className="text-sm font-semibold">Changement publié : {item.changeSummary}</p> : null}
        <p className="text-sm leading-6">{item.description}</p>
        <p className="font-semibold">{indicativePrice(item.budgetCents, item.budgetMode === "discuter" ? "discuter" : "indicatif", item.currency)}</p>
        <p className="text-sm">Livrables : {item.deliverables}</p>
        <p className="text-sm">{item.seats} place{item.seats > 1 ? "s" : ""} · délai {item.durationDays} jours · publié par {kind}</p>
        {item.conditions ? <p className="text-sm">Conditions : {item.conditions}</p> : null}
        {item.deadline ? <p className="text-sm">Candidatures jusqu'au {item.deadline}</p> : null}
        <p className="text-sm">Client : <Link href={`/profil/${item.username}`} className="font-semibold text-accent">{item.name}</Link></p>
        <p className="text-xs leading-5 text-muted">{paymentNotice} Aucun badge d'entreprise vérifiée n'est affiché.</p>
        <ShareLink path={`/talents/opportunites/${item.id}`} label="Partager" />
        {mine ? <Link href={`/talents/opportunites/${item.id}/modifier`} className="btn btn-line w-fit">Modifier la mission</Link> : null}
        <ReportButton targetType="opportunity" targetId={item.id} path={`/talents/opportunites/${item.id}`} />
      </div>
      {!mine && user && item.status === "published" ? <ApplicationForm opportunityId={item.id} works={works.map((work) => ({ id: work.id, title: work.title }))} /> : null}
      {!user ? <Link href={`/connexion?next=/talents/opportunites/${item.id}`} className="btn btn-primary w-fit">Se connecter pour candidater</Link> : null}
      {mine ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-bold">Candidatures</h2>
          {applications.length === 0 ? <p className="text-sm text-muted">Aucune candidature pour le moment.</p> : applications.map((application) => (
            <article key={application.id} className="panel grid gap-2 p-4">
              <p className="text-sm font-semibold">{applicationStatusLabels[application.status] ?? application.status}</p>
              <p className="text-sm leading-6">{application.pitch}</p>
              <ActionForm action={setApplicationStatus} submit="Mettre à jour" path={`/talents/opportunites/${item.id}`}>
                <input type="hidden" name="id" value={application.id} />
                <select name="status" className="field" defaultValue={application.status}>
                  <option value="reviewing">En examen</option>
                  <option value="shortlisted">Présélectionner</option>
                  <option value="refused">Refuser</option>
                  <option value="accepted">Accepter et ouvrir le projet</option>
                </select>
              </ActionForm>
            </article>
          ))}
        </section>
      ) : null}
    </article>
  );
}
