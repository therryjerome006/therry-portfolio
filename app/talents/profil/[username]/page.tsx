import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockButton } from "@/components/network/JoinButton";
import { ReportButton } from "@/components/network/ReportButton";
import { ShareLink } from "@/components/network/ShareLink";
import { PortfolioCard, ServiceCard } from "@/components/talents/Cards";
import { availabilityLabels, levelNotice } from "@/lib/talents/copy";
import { loadTalentByUsername } from "@/lib/talents/queries";
import { skillLevels } from "@/lib/talents/rules";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TalentProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const talent = await loadTalentByUsername(username);
  if (!talent) notFound();
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const mine = user?.id === talent.person.userId;
  const blocked = user && supabase
    ? Boolean((await supabase.from("blocks").select("blocker_id").eq("blocker_id", user.id).eq("blocked_id", talent.person.userId).maybeSingle()).data)
    : false;
  const publicPortfolio = talent.portfolio.filter((item) => mine || item.status === "published");
  const publicServices = talent.services.filter((item) => mine || item.status === "published");
  return (
    <article className="grid gap-4">
      <header className="profile-sheet grid gap-3 p-4">
        <h1 className="text-3xl font-bold">{talent.person.name}</h1>
        <p className="text-sm text-muted">@{talent.person.username}</p>
        {talent.person.title ? <p className="font-semibold">{talent.person.title}</p> : null}
        {talent.person.bio ? <p className="text-sm leading-6">{talent.person.bio}</p> : null}
        {talent.person.availability ? <p className="text-sm">{availabilityLabels[talent.person.availability]}</p> : null}
        <div className="flex flex-wrap gap-2">{talent.person.categories.map((item) => <span key={item.slug} className="bg-[#e7f1ff] px-2 py-1 text-xs font-semibold text-[#1557c0]">{item.name}</span>)}</div>
        <div className="flex flex-wrap gap-2">
          <ShareLink path={`/talents/profil/${talent.person.username}`} label="Partager" />
          {mine ? <Link href="/talents/moi" className="btn btn-primary">Modifier</Link> : null}
          {!mine && user ? <BlockButton userId={talent.person.userId} blocked={blocked} path={`/talents/profil/${talent.person.username}`} /> : null}
        </div>
        <ReportButton targetType="talent" targetId={talent.person.userId} path={`/talents/profil/${talent.person.username}`} />
      </header>
      <section className="grid gap-2">
        <h2 className="text-xl font-bold">Compétences déclarées</h2>
        <p className="text-xs text-muted">{levelNotice}</p>
        {talent.skills.length === 0 ? <p className="text-sm text-muted">Aucune compétence publiée.</p> : (
          <ul className="flex flex-wrap gap-2">{talent.skills.map((skill) => <li key={skill.name} className="border border-line px-2 py-1 text-sm">{skill.name} · {skillLevels.find((level) => level.value === skill.level)?.label ?? skill.level}</li>)}</ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Portfolio</h2>
        {publicPortfolio.length === 0 ? <p className="text-sm text-muted">Aucune réalisation publique.</p> : <ul className="grid gap-3 sm:grid-cols-2">{publicPortfolio.map((item) => <li key={item.id}><PortfolioCard item={item} /></li>)}</ul>}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Services</h2>
        {publicServices.length === 0 ? <p className="text-sm text-muted">Aucun service public.</p> : <ul className="grid gap-3 sm:grid-cols-2">{publicServices.map((service) => <li key={service.id}><ServiceCard service={service} /></li>)}</ul>}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-bold">Avis après mission</h2>
        {talent.reviews.length === 0 ? <p className="text-sm text-muted">Aucun avis. Les avis ne sont pas inventés.</p> : talent.reviews.map((review) => (
          <article key={review.id} className="panel p-3 text-sm"><p>{review.rating}/5 · {review.body}</p>{review.reply ? <p className="mt-1">Réponse : {review.reply}</p> : null}</article>
        ))}
      </section>
    </article>
  );
}
