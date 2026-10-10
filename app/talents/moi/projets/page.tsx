import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptServiceRequest } from "@/lib/actions/talents";
import { ActionForm } from "@/components/talents/ActionForm";
import { projectStatusLabels } from "@/lib/talents/copy";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect("/connexion?next=/talents/moi/projets");
  const [{ data: projects }, { data: requests }] = await Promise.all([
    supabase.from("talent_projects").select("id, title, status, client_id, provider_id").or(`client_id.eq.${user.id},provider_id.eq.${user.id}`).order("updated_at", { ascending: false }),
    supabase.from("service_requests").select("id, message, status, service_id").eq("status", "sent"),
  ]);
  const incoming = [];
  for (const request of requests ?? []) {
    const { data: service } = await supabase.from("services").select("user_id, title").eq("id", request.service_id).maybeSingle();
    if (service?.user_id === user.id) incoming.push({ ...request, title: service.title });
  }
  return (
    <>
      <h1 className="text-3xl font-bold">Mes projets</h1>
      {incoming.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-xl font-bold">Demandes reçues</h2>
          {incoming.map((request) => (
            <article key={request.id} className="panel grid gap-2 p-4">
              <p className="font-bold">{request.title}</p>
              <p className="text-sm">{request.message}</p>
              <ActionForm action={acceptServiceRequest} submit="Accepter et ouvrir le projet" path="/talents/moi/projets">
                <input type="hidden" name="id" value={request.id} />
              </ActionForm>
            </article>
          ))}
        </section>
      ) : null}
      {(projects ?? []).length === 0 ? <p className="text-sm text-muted">Aucun projet. Un projet est créé seulement après une acceptation réelle.</p> : (
        <ul className="grid gap-3">
          {(projects ?? []).map((project) => (
            <li key={project.id}><Link href={`/talents/moi/projets/${project.id}`} className="panel block p-4"><span className="font-bold">{project.title}</span><span className="mt-1 block text-sm text-muted">{projectStatusLabels[project.status] ?? project.status}</span></Link></li>
          ))}
        </ul>
      )}
    </>
  );
}
