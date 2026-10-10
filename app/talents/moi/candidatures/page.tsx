import Link from "next/link";
import { redirect } from "next/navigation";
import { setApplicationStatus } from "@/lib/actions/talents";
import { ActionForm } from "@/components/talents/ActionForm";
import { applicationStatusLabels } from "@/lib/talents/copy";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect("/connexion?next=/talents/moi/candidatures");
  const { data } = await supabase.from("applications").select("id, opportunity_id, pitch, status, created_at").eq("user_id", user.id).order("updated_at", { ascending: false });
  return (
    <>
      <h1 className="text-3xl font-bold">Mes candidatures</h1>
      <p className="text-sm text-muted">Une candidature n'est visible que par vous et par la personne qui a publié la mission.</p>
      {(data ?? []).length === 0 ? <p className="text-sm text-muted">Aucune candidature.</p> : (
        <ul className="grid gap-3">
          {(data ?? []).map((item) => (
            <li key={item.id} className="panel grid gap-2 p-4">
              <Link href={`/talents/opportunites/${item.opportunity_id}`} className="font-bold text-accent">Voir la mission</Link>
              <p className="text-sm font-semibold">{applicationStatusLabels[item.status] ?? item.status}</p>
              <p className="text-sm leading-6">{item.pitch}</p>
              {["draft", "sent", "reviewing", "shortlisted"].includes(item.status) ? (
                <ActionForm action={setApplicationStatus} submit="Retirer" path="/talents/moi/candidatures">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="status" value="withdrawn" />
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
