import { requireAdmin } from "@/lib/auth/session";
import { cleanupTalentFiles, decideAuthorization, moderateTalent, saveTalentCategory, saveTalentSkill, setTalentPolicy } from "@/lib/actions/talent-admin";
import { dbPool } from "@/lib/media/db";

export const dynamic = "force-dynamic";

export default async function AdminTalentsPage() {
  await requireAdmin();
  const pool = dbPool();
  if (!pool) return <p>La base n'est pas configurée.</p>;
  const [policy, categories, reports, disputes, authorizations] = await Promise.all([
    pool.query("select paid_minors_enabled, org_offers_enabled from public.talent_policy where id = 1"),
    pool.query("select id, slug, name, description, sort_order, active, parent_id from public.talent_categories order by sort_order, name"),
    pool.query("select id, target_type, target_id, reason, status, created_at from public.reports where target_type in ('talent', 'portfolio', 'service', 'opportunity', 'review', 'talent_project') order by case when reason in ('sexuel', 'violence', 'harcelement') then 0 else 1 end, created_at desc limit 30"),
    pool.query("select id, title, status from public.talent_projects where status = 'dispute' order by updated_at desc limit 20"),
    pool.query("select id, user_id, status, created_at from public.talent_authorizations order by created_at desc limit 20"),
  ]);
  const flags = policy.rows[0] ?? { paid_minors_enabled: false, org_offers_enabled: false };
  return (
    <div className="grid gap-8">
      <header>
        <h1 className="text-3xl font-bold">Talents</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Les missions rémunérées des moins de 18 ans restent fermées tant que le contrôle n'est pas ouvert. L'ouvrir ne constitue pas une validation juridique.</p>
      </header>
      <form action={setTalentPolicy} className="panel grid gap-3 p-4">
        <label className="flex gap-2 text-sm"><input type="checkbox" name="paidMinors" value="oui" defaultChecked={flags.paid_minors_enabled === true} />Autoriser le contrôle des missions rémunérées pour les moins de 18 ans</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" name="orgOffers" value="oui" defaultChecked={flags.org_offers_enabled === true} />Autoriser les organisations à publier vers les mineurs</label>
        <label className="grid gap-1 text-sm font-semibold">Pour ouvrir un contrôle, écrivez VALIDATION JURIDIQUE<input name="phrase" className="field" autoComplete="off" /></label>
        <button className="btn btn-primary w-fit" type="submit">Enregistrer les contrôles</button>
      </form>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Catégories</h2>
        {categories.rows.map((category) => (
          <form key={category.id} action={saveTalentCategory} className="grid gap-2 border border-line p-3 md:grid-cols-4">
            <input type="hidden" name="id" value={category.id} />
            <input name="slug" defaultValue={category.slug} className="field" aria-label="Slug" />
            <input name="name" defaultValue={category.name} className="field" aria-label="Nom" />
            <input name="sort" type="number" defaultValue={category.sort_order} className="field" aria-label="Ordre" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" value="oui" defaultChecked={category.active} />Active</label>
            <select name="parent" defaultValue={category.parent_id ?? ""} className="field" aria-label="Catégorie parente">
              <option value="">Catégorie principale</option>
              {categories.rows.filter((item) => !item.parent_id && item.id !== category.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="btn btn-line" type="submit">Mettre à jour</button>
          </form>
        ))}
        <form action={saveTalentCategory} className="grid gap-2 md:grid-cols-3">
          <input name="slug" placeholder="slug" className="field" aria-label="Nouveau slug" />
          <input name="name" placeholder="Nom" className="field" aria-label="Nouveau nom" />
          <input type="hidden" name="active" value="oui" />
          <button className="btn btn-primary" type="submit">Ajouter une catégorie</button>
        </form>
        <form action={saveTalentSkill} className="grid gap-2 md:grid-cols-3">
          <select name="category" className="field" aria-label="Catégorie de la compétence">{categories.rows.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <input name="name" placeholder="Compétence" className="field" aria-label="Nom de la compétence" />
          <button className="btn btn-line" type="submit">Ajouter</button>
        </form>
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Signalements</h2>
        {reports.rows.length === 0 ? <p className="text-sm text-muted">Aucun signalement Talents.</p> : reports.rows.map((report) => (
          <form key={report.id} action={moderateTalent} className="grid gap-2 border border-line p-3">
            <input type="hidden" name="kind" value="report" />
            <input type="hidden" name="id" value={report.id} />
            <p className="text-sm">{report.target_type} · {report.reason} · {report.status}</p>
            <input name="reason" required minLength={3} placeholder="Motif de la décision" className="field" />
            <select name="action" className="field">
              <option value="reviewed">En cours</option>
              <option value="escalated">Escalader</option>
              <option value="resolved">Résolu</option>
              <option value="dismissed">Rejeté</option>
              <option value="closed">Fermé</option>
            </select>
            <button className="btn btn-line w-fit" type="submit">Enregistrer</button>
          </form>
        ))}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Projets en examen</h2>
        {disputes.rows.length === 0 ? <p className="text-sm text-muted">Aucun litige.</p> : disputes.rows.map((project) => (
          <form key={project.id} action={moderateTalent} className="grid gap-2 border border-line p-3">
            <input type="hidden" name="kind" value="project" />
            <input type="hidden" name="id" value={project.id} />
            <p className="text-sm font-semibold">{project.title}</p>
            <input name="reason" required minLength={3} placeholder="Décision" className="field" />
            <select name="action" className="field"><option value="active">Reprendre</option><option value="done">Clôturer</option><option value="cancelled">Annuler</option></select>
            <button className="btn btn-line w-fit" type="submit">Appliquer</button>
          </form>
        ))}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Autorisations</h2>
        <p className="text-sm text-muted">Une décision ici n'est pas, à elle seule, une validation juridique.</p>
        {authorizations.rows.map((item) => (
          <form key={item.id} action={decideAuthorization} className="grid gap-2 border border-line p-3">
            <input type="hidden" name="id" value={item.id} />
            <p className="text-sm">{item.status}</p>
            <select name="status" className="field"><option value="pending_review">En examen</option><option value="granted">Accordée</option><option value="revoked">Révoquée</option></select>
            <input name="proof" className="field" placeholder="Note interne, non publique" />
            <button className="btn btn-line w-fit" type="submit">Décider</button>
          </form>
        ))}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Suspension</h2>
        <form action={moderateTalent} className="grid gap-2 md:grid-cols-2">
          <select name="kind" className="field"><option value="service">Service</option><option value="opportunity">Mission</option><option value="profile">Profil</option><option value="review">Avis</option></select>
          <input name="id" required className="field" placeholder="Identifiant" aria-label="Identifiant" />
          <select name="action" className="field"><option value="suspend">Suspendre</option><option value="hold">Retenir le profil</option><option value="hide">Masquer l'avis</option><option value="restore">Rendre en brouillon</option></select>
          <input name="reason" required minLength={3} className="field" placeholder="Motif" />
          <button className="btn btn-primary w-fit" type="submit">Appliquer</button>
        </form>
        <form action={cleanupTalentFiles}><button className="btn btn-line" type="submit">Nettoyer au plus 20 fichiers orphelins</button></form>
      </section>
    </div>
  );
}
