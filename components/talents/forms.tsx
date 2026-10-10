"use client";

import { ActionForm } from "@/components/talents/ActionForm";
import { requestPaidAuthorization, saveOpportunity, savePortfolio, saveService, saveTalentProfile, sendApplication, requestService } from "@/lib/actions/talents";
import { clientKinds, missionTypes, offerKinds, portfolioOrigins, skillLevels, talentLanguages } from "@/lib/talents/rules";
import { levelNotice, publishReminder } from "@/lib/talents/copy";

type Choice = { id: string; name: string; categoryId?: string; slug?: string };

export function ProfileForm({
  categories,
  skills,
  initial,
}: {
  categories: Choice[];
  skills: Choice[];
  initial?: { name: string; title: string; bio: string; availability: string; languages: string[]; categoryIds: string[]; skillIds: string[] };
}) {
  return (
    <ActionForm action={saveTalentProfile} submit="Enregistrer" path="/talents/moi">
      <label className="grid gap-1 text-sm font-semibold">Nom professionnel ou pseudonyme<input name="name" required minLength={2} maxLength={40} defaultValue={initial?.name} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Titre<input name="title" maxLength={80} defaultValue={initial?.title} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Présentation<textarea name="bio" maxLength={500} rows={5} defaultValue={initial?.bio} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Disponibilité
        <select name="availability" defaultValue={initial?.availability ?? ""} className="field">
          <option value="">Non précisée</option>
          <option value="disponible">Disponible</option>
          <option value="limitee">Disponibilité limitée</option>
          <option value="indisponible">Indisponible</option>
        </select>
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Langues de travail</legend>
        {talentLanguages.map((language) => (
          <label key={language.code} className="flex gap-2 text-sm"><input type="checkbox" name="languages" value={language.code} defaultChecked={initial?.languages.includes(language.code)} />{language.label}</label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Catégories</legend>
        {categories.map((category) => (
          <label key={category.id} className="flex gap-2 text-sm"><input type="checkbox" name="categories" value={category.id} defaultChecked={initial?.categoryIds.includes(category.id)} />{category.name}</label>
        ))}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Compétences</legend>
        <p className="text-xs text-muted">{levelNotice}</p>
        {skills.map((skill) => (
          <label key={skill.id} className="grid gap-1 text-sm sm:grid-cols-[1fr_10rem]">
            <span className="flex gap-2"><input type="checkbox" name="skills" value={skill.id} defaultChecked={initial?.skillIds.includes(skill.id)} />{skill.name}</span>
            <select name={`level-${skill.id}`} defaultValue="decouverte" className="field">{skillLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}</select>
          </label>
        ))}
      </fieldset>
      <label className="flex gap-2 text-sm font-semibold"><input type="checkbox" name="publish" value="oui" />Publier la vitrine</label>
    </ActionForm>
  );
}

export function PortfolioForm({
  categories,
  skills,
  id,
  initial,
}: {
  categories: Choice[];
  skills: Choice[];
  id?: string;
  initial?: { title: string; description: string; origin: string; role: string; period: string; url: string; category: string; status: string };
}) {
  return (
    <ActionForm action={savePortfolio} submit="Enregistrer la réalisation" path="/talents/moi">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <p className="text-sm leading-6 text-muted">{publishReminder}</p>
      <label className="grid gap-1 text-sm font-semibold">Titre<input name="title" required minLength={2} maxLength={80} defaultValue={initial?.title} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Description<textarea name="description" maxLength={2000} rows={5} defaultValue={initial?.description} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Cadre
        <select name="origin" className="field" required defaultValue={initial?.origin ?? "personnel"}>{portfolioOrigins.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      </label>
      <label className="grid gap-1 text-sm font-semibold">Votre rôle<input name="role" maxLength={80} defaultValue={initial?.role} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Période approximative<input name="period" maxLength={40} defaultValue={initial?.period} className="field" placeholder="2026" /></label>
      <label className="grid gap-1 text-sm font-semibold">Lien https facultatif<input name="url" defaultValue={initial?.url} className="field" placeholder="https://" /></label>
      <label className="grid gap-1 text-sm font-semibold">Catégorie
        <select name="category" className="field" defaultValue={initial?.category ?? ""}><option value="">Aucune</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </label>
      <fieldset className="grid gap-2"><legend className="text-sm font-semibold">Compétences</legend>{skills.map((skill) => <label key={skill.id} className="flex gap-2 text-sm"><input type="checkbox" name="skills" value={skill.id} />{skill.name}</label>)}</fieldset>
      <label className="grid gap-1 text-sm font-semibold">Image JPEG, PNG ou WebP<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Statut
        <select name="status" className="field" defaultValue={initial?.status ?? "draft"}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select>
      </label>
    </ActionForm>
  );
}

export function ServiceForm({
  categories,
  skills,
  initial,
}: {
  categories: Choice[];
  skills: Choice[];
  initial?: { id: string; title: string; description: string; category: string; offerKind: string; deliverables: string; prerequisites: string; priceMode: string; price: string; currency: string; delay: number; revisions: number; status: string };
}) {
  return (
    <ActionForm action={saveService} submit="Enregistrer le service" path="/talents/services/nouveau">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <label className="grid gap-1 text-sm font-semibold">Titre<input name="title" required minLength={3} maxLength={80} defaultValue={initial?.title} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Description<textarea name="description" required minLength={20} maxLength={4000} rows={6} defaultValue={initial?.description} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Catégorie<select name="category" required className="field" defaultValue={initial?.category}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Type<select name="offerKind" className="field" defaultValue={initial?.offerKind ?? "creation"}>{offerKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Livrables<input name="deliverables" required minLength={2} maxLength={500} defaultValue={initial?.deliverables} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Prérequis du client<input name="prerequisites" maxLength={500} defaultValue={initial?.prerequisites} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Étapes de réalisation<textarea name="steps" maxLength={1000} rows={3} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Image de couverture<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Texte alternatif de l'image<input name="alt" maxLength={120} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Prix<select name="priceMode" className="field" defaultValue={initial?.priceMode ?? "indicatif"}><option value="indicatif">Prix indicatif</option><option value="convenir">Prix à convenir</option></select></label>
      <label className="grid gap-1 text-sm font-semibold">Montant indicatif<input name="price" inputMode="decimal" defaultValue={initial?.price} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Devise<select name="currency" className="field" defaultValue={initial?.currency ?? "HTG"}><option value="HTG">HTG</option><option value="USD">USD</option></select></label>
      <label className="grid gap-1 text-sm font-semibold">Délai estimé en jours<input name="delay" type="number" min={1} max={365} required defaultValue={initial?.delay} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Révisions incluses<input name="revisions" type="number" min={0} max={20} defaultValue={initial?.revisions ?? 0} className="field" /></label>
      <fieldset className="grid gap-2 border border-line p-3">
        <legend className="text-sm font-semibold">Formules facultatives</legend>
        <p className="text-xs leading-5 text-muted">Basique, Standard et Premium sont des informations. Les choisir n'ouvre aucun paiement.</p>
        {(["basique", "standard", "premium"] as const).map((tier) => (
          <div key={tier} className="grid gap-2 border border-line p-2">
            <p className="text-sm font-bold capitalize">{tier}</p>
            <label className="grid gap-1 text-sm font-semibold">Nom<input name={`${tier}-title`} maxLength={40} className="field" /></label>
            <label className="grid gap-1 text-sm font-semibold">Contenu<textarea name={`${tier}-includes`} maxLength={500} rows={2} className="field" /></label>
            <label className="grid gap-1 text-sm font-semibold">Prix<select name={`${tier}-mode`} className="field" defaultValue="indicatif"><option value="indicatif">Indicatif</option><option value="convenir">À convenir</option></select></label>
            <label className="grid gap-1 text-sm font-semibold">Montant<input name={`${tier}-price`} inputMode="decimal" className="field" /></label>
            <label className="grid gap-1 text-sm font-semibold">Devise<select name={`${tier}-currency`} className="field" defaultValue="HTG"><option value="HTG">HTG</option><option value="USD">USD</option></select></label>
            <label className="grid gap-1 text-sm font-semibold">Délai<input name={`${tier}-delay`} type="number" min={1} max={365} className="field" /></label>
            <label className="grid gap-1 text-sm font-semibold">Révisions<input name={`${tier}-revisions`} type="number" min={0} max={20} className="field" /></label>
          </div>
        ))}
      </fieldset>
      <fieldset className="grid gap-2 border border-line p-3">
        <legend className="text-sm font-semibold">Option supplémentaire</legend>
        <label className="grid gap-1 text-sm font-semibold">Nom<input name="addon-title" maxLength={60} className="field" /></label>
        <label className="grid gap-1 text-sm font-semibold">Montant indicatif<input name="addon-price" inputMode="decimal" className="field" /></label>
        <label className="grid gap-1 text-sm font-semibold">Devise<select name="addon-currency" className="field"><option value="HTG">HTG</option><option value="USD">USD</option></select></label>
      </fieldset>
      <fieldset className="grid gap-2"><legend className="text-sm font-semibold">Compétences</legend>{skills.map((skill) => <label key={skill.id} className="flex gap-2 text-sm"><input type="checkbox" name="skills" value={skill.id} />{skill.name}</label>)}</fieldset>
      <label className="grid gap-1 text-sm font-semibold">Statut<select name="status" className="field" defaultValue={initial?.status ?? "draft"}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select></label>
      <p className="text-xs leading-5 text-muted">Le prix est indicatif quand il est affiché. TY Space ne garantit ni le paiement ni la livraison. Un service suspendu par la modération ne peut pas être republié ici.</p>
    </ActionForm>
  );
}

export function OpportunityForm({
  categories,
  skills,
  initial,
}: {
  categories: Choice[];
  skills: Choice[];
  initial?: { id: string; title: string; description: string; clientKind: string; missionType: string; category: string; deliverables: string; conditions: string; budgetMode: string; price: string; currency: string; duration: number; seats: number; deadline: string; openToMinors: boolean; status?: string };
}) {
  return (
    <ActionForm action={saveOpportunity} submit="Enregistrer la mission" path="/talents/opportunites/nouveau">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <label className="grid gap-1 text-sm font-semibold">Titre<input name="title" required minLength={3} maxLength={80} defaultValue={initial?.title} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Description<textarea name="description" required minLength={20} maxLength={4000} rows={6} defaultValue={initial?.description} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Vous publiez en tant que<select name="clientKind" className="field" defaultValue={initial?.clientKind ?? "membre"}>{clientKinds.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Type<select name="missionType" className="field" defaultValue={initial?.missionType ?? "educatif"}>{missionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Catégorie<select name="category" required className="field" defaultValue={initial?.category}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Livrables attendus<input name="deliverables" required minLength={2} defaultValue={initial?.deliverables} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Conditions<input name="conditions" maxLength={500} defaultValue={initial?.conditions} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Budget<select name="budgetMode" className="field" defaultValue={initial?.budgetMode ?? "discuter"}><option value="discuter">À discuter</option><option value="indicatif">Budget indicatif</option></select></label>
      <label className="grid gap-1 text-sm font-semibold">Montant<input name="price" inputMode="decimal" defaultValue={initial?.price} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Devise<select name="currency" className="field" defaultValue={initial?.currency ?? "HTG"}><option value="HTG">HTG</option><option value="USD">USD</option></select></label>
      <label className="grid gap-1 text-sm font-semibold">Délai de réalisation en jours<input name="duration" type="number" min={1} max={365} required defaultValue={initial?.duration} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Places<input name="seats" type="number" min={1} max={10} defaultValue={initial?.seats ?? 1} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Date limite de candidature facultative<input name="deadline" type="date" defaultValue={initial?.deadline} className="field" /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" name="openToMinors" value="oui" defaultChecked={initial?.openToMinors} />Cette mission peut être proposée à des membres de moins de 18 ans</label>
      <fieldset className="grid gap-2"><legend className="text-sm font-semibold">Compétences utiles</legend>{skills.map((skill) => <label key={skill.id} className="flex gap-2 text-sm"><input type="checkbox" name="skills" value={skill.id} />{skill.name}</label>)}</fieldset>
      <label className="grid gap-1 text-sm font-semibold">Statut<select name="status" className="field" defaultValue={initial?.status === "published" || initial?.status === "closed" || initial?.status === "archived" ? initial.status : "draft"}><option value="draft">Brouillon</option><option value="published">Publier</option><option value="closed">Clôturer</option><option value="archived">Archiver</option></select></label>
      <p className="text-xs leading-5 text-muted">Aucun badge « entreprise vérifiée » n'est affiché. Une association ou une entreprise qui ouvre une mission aux mineurs reste en vérification tant que ce contrôle n'est pas activé.</p>
    </ActionForm>
  );
}

export function ApplicationForm({ opportunityId, works }: { opportunityId: string; works: { id: string; title: string }[] }) {
  return (
    <ActionForm action={sendApplication} submit="Envoyer la candidature" path={`/talents/opportunites/${opportunityId}`}>
      <input type="hidden" name="opportunity" value={opportunityId} />
      <label className="grid gap-1 text-sm font-semibold">Votre proposition<textarea name="pitch" required minLength={20} maxLength={2000} rows={5} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Délai estimé en jours<input name="delay" type="number" min={1} max={365} className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Proposition de prix<select name="priceMode" className="field"><option value="convenir">À convenir</option><option value="indicatif">Montant indicatif</option></select></label>
      <label className="grid gap-1 text-sm font-semibold">Montant<input name="price" inputMode="decimal" className="field" /></label>
      <label className="grid gap-1 text-sm font-semibold">Question facultative<input name="question" maxLength={500} className="field" /></label>
      {works.length > 0 ? <fieldset className="grid gap-2"><legend className="text-sm font-semibold">Réalisations à joindre</legend>{works.map((work) => <label key={work.id} className="flex gap-2 text-sm"><input type="checkbox" name="works" value={work.id} />{work.title}</label>)}</fieldset> : null}
    </ActionForm>
  );
}

export function ServiceRequestForm({ serviceId }: { serviceId: string }) {
  return (
    <ActionForm action={requestService} submit="Demander cette prestation" path={`/talents/services/${serviceId}`}>
      <input type="hidden" name="service" value={serviceId} />
      <label className="grid gap-1 text-sm font-semibold">Votre besoin<textarea name="message" required minLength={2} maxLength={1000} rows={4} className="field" /></label>
      <p className="text-xs leading-5 text-muted">La demande reste sur TY Space. Aucune adresse ni aucun numéro n'est transmis.</p>
    </ActionForm>
  );
}

export function AuthorizationButton() {
  return (
    <form action={async () => { await requestPaidAuthorization(); }}>
      <button className="btn btn-line" type="submit">Demander une autorisation pour les missions rémunérées</button>
      <p className="mt-2 text-xs leading-5 text-muted">La demande est enregistrée. Elle n'est pas une preuve, et elle n'ouvre pas les missions rémunérées tant que le contrôle serveur reste fermé.</p>
    </form>
  );
}
