import { notFound, redirect } from "next/navigation";
import { decideAmendment, moveProject, proposeAmendment, replyToReview, sendProjectMessage, submitDeliverable, submitReview } from "@/lib/actions/talents";
import { ActionForm } from "@/components/talents/ActionForm";
import { paymentNotice, projectStatusLabels } from "@/lib/talents/copy";
import { indicativePrice } from "@/lib/talents/rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect(`/connexion?next=/talents/moi/projets/${id}`);
  const { data: project } = await supabase.from("talent_projects").select("*").eq("id", id).maybeSingle();
  if (!project || (project.client_id !== user.id && project.provider_id !== user.id)) notFound();
  const [{ data: messages }, { data: deliverables }, { data: events }, { data: amendments }, { data: reviews }] = await Promise.all([
    supabase.from("project_messages").select("id, author_id, body, created_at").eq("project_id", id).order("created_at"),
    supabase.from("project_deliverables").select("id, comment, external_url, version, storage_path").eq("project_id", id).order("version"),
    supabase.from("project_events").select("id, kind, note, created_at").eq("project_id", id).order("created_at"),
    supabase.from("project_amendments").select("id, author_id, price_cents, price_mode, delay_days, deliverables, note, status").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("talent_reviews").select("id, author_id, subject_id, rating, body, reply, status").eq("project_id", id),
  ]);
  const provider = project.provider_id === user.id;
  const other = provider ? project.client_id : project.provider_id;
  const path = `/talents/moi/projets/${id}`;
  return (
    <article className="grid gap-4">
      <header className="panel grid gap-2 p-4">
        <h1 className="text-3xl font-bold">{project.title}</h1>
        <p className="text-sm font-semibold">{projectStatusLabels[project.status] ?? project.status}</p>
        <p className="text-sm leading-6">{project.description}</p>
        <p className="text-sm">Conditions convenues : {indicativePrice(project.price_cents, project.price_mode, project.currency)} · {project.delay_days} jours</p>
        <p className="text-sm">Livrables : {project.deliverables}</p>
        {project.revision_limit != null ? <p className="text-sm">Révisions : {project.revisions_used}/{project.revision_limit}</p> : <p className="text-sm">Révisions : non limitées à l'avance.</p>}
        <p className="text-xs leading-5 text-muted">{paymentNotice} Le projet ne peut pas être marqué comme payé par TY Space.</p>
      </header>
      <section className="grid gap-2">
        <h2 className="text-xl font-bold">Étapes</h2>
        <ActionForm action={moveProject} submit="Enregistrer l'étape" path={path}>
          <input type="hidden" name="id" value={id} />
          <select name="status" className="field">
            {provider ? <option value="preparing">Passer en préparation</option> : null}
            {provider ? <option value="active">Passer en cours</option> : null}
            {!provider ? <option value="accepted">Accepter le livrable</option> : null}
            {!provider ? <option value="revision">Demander une révision</option> : null}
            {!provider ? <option value="done">Marquer comme terminé</option> : null}
            <option value="dispute">Signaler un problème</option>
            <option value="cancelled">Accepter l'annulation</option>
            <option value="cancel-request">Demander l'annulation</option>
          </select>
          <input name="note" maxLength={280} className="field" placeholder="Motif, si utile" />
        </ActionForm>
        <ul className="grid gap-2">{(events ?? []).map((event) => <li key={event.id} className="text-sm text-muted">{event.kind}{event.note ? ` — ${event.note}` : ""}</li>)}</ul>
      </section>
      <section className="grid gap-2">
        <h2 className="text-xl font-bold">Messages du projet</h2>
        <ul className="grid gap-2">{(messages ?? []).map((message) => <li key={message.id} className="panel p-3 text-sm"><span className="font-semibold">{message.author_id === user.id ? "Vous" : "L'autre participant"}</span> · {message.body}</li>)}</ul>
        <ActionForm action={sendProjectMessage} submit="Envoyer" path={path}>
          <input type="hidden" name="id" value={id} />
          <textarea name="body" required maxLength={1000} rows={3} className="field" aria-label="Message" />
        </ActionForm>
      </section>
      <section className="grid gap-2">
        <h2 className="text-xl font-bold">Livrables</h2>
        <ul className="grid gap-2">
          {(deliverables ?? []).map((item) => (
            <li key={item.id} className="panel p-3 text-sm">
              <p>Version {item.version}</p>
              {item.comment ? <p>{item.comment}</p> : null}
              {item.storage_path ? <a className="font-semibold text-accent" href={`/api/talents/fichier?id=${item.id}&type=livrable`}>Ouvrir le fichier privé</a> : null}
              {item.external_url ? <a className="font-semibold text-accent" href={item.external_url}>Lien du livrable</a> : null}
            </li>
          ))}
        </ul>
        {provider ? (
          <ActionForm action={submitDeliverable} submit="Soumettre un livrable" path={path}>
            <input type="hidden" name="id" value={id} />
            <textarea name="comment" maxLength={1000} rows={3} className="field" placeholder="Commentaire de livraison" />
            <input name="url" className="field" placeholder="https:// lien facultatif" />
            <input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="field" />
          </ActionForm>
        ) : null}
      </section>
      <section className="grid gap-2">
        <h2 className="text-xl font-bold">Avenant</h2>
        <p className="text-sm text-muted">Les conditions ne changent que si l'autre personne accepte.</p>
        {(amendments ?? []).map((item) => (
          <article key={item.id} className="panel grid gap-2 p-3 text-sm">
            <p>{item.status} · {item.delay_days} jours · {item.deliverables}</p>
            {item.note ? <p>{item.note}</p> : null}
            {item.status === "pending" && item.author_id !== user.id ? (
              <ActionForm action={decideAmendment} submit="Décider" path={path}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="project" value={id} />
                <select name="accept" className="field"><option value="oui">Accepter</option><option value="non">Refuser</option></select>
              </ActionForm>
            ) : null}
          </article>
        ))}
        <ActionForm action={proposeAmendment} submit="Proposer un avenant" path={path}>
          <input type="hidden" name="id" value={id} />
          <select name="priceMode" className="field"><option value="discuter">Prix à discuter</option><option value="indicatif">Prix indicatif</option></select>
          <input name="price" className="field" placeholder="Montant" />
          <input name="delay" type="number" min={1} max={365} required className="field" aria-label="Délai" />
          <input name="deliverables" required className="field" placeholder="Livrables" />
          <input name="note" className="field" placeholder="Note" />
        </ActionForm>
      </section>
      {project.status === "done" ? (
        <section className="grid gap-2">
          <h2 className="text-xl font-bold">Avis</h2>
          <p className="text-xs text-muted">Un avis décrit une mission terminée. Ce n'est pas une certification.</p>
          {(reviews ?? []).map((review) => (
            <article key={review.id} className="panel grid gap-2 p-3 text-sm">
              <p>{review.rating}/5 · {review.body}</p>
              {review.reply ? <p>Réponse : {review.reply}</p> : null}
              {review.subject_id === user.id && !review.reply ? (
                <ActionForm action={replyToReview} submit="Répondre" path={path}>
                  <input type="hidden" name="id" value={review.id} />
                  <textarea name="reply" required minLength={2} maxLength={800} className="field" />
                </ActionForm>
              ) : null}
            </article>
          ))}
          {(reviews ?? []).every((review) => review.author_id !== user.id) ? (
            <ActionForm action={submitReview} submit="Publier l'avis" path={path}>
              <input type="hidden" name="project" value={id} />
              <input type="hidden" name="subject" value={other} />
              <select name="rating" className="field" aria-label="Note"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>
              <textarea name="body" required minLength={2} maxLength={800} className="field" />
            </ActionForm>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
