import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportButton } from "@/components/network/ReportButton";
import { exerciseNotice } from "@/lib/talents/copy";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data } = await supabase.from("portfolio_items").select("id, user_id, title, description, origin, role_label, period_label, external_url, status").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { data: media } = await supabase.from("portfolio_media").select("id").eq("item_id", id);
  const user = (await supabase.auth.getUser()).data.user;
  return (
    <article className="panel grid gap-3 p-4">
      <h1 className="text-3xl font-bold">{data.title}</h1>
      {data.origin === "exercice" ? <p className="text-sm font-semibold text-[#9f1239]">{exerciseNotice}</p> : null}
      {data.status !== "published" ? <p className="text-sm">Aperçu privé : cette réalisation n'est pas publique.</p> : null}
      <p className="text-sm leading-6">{data.description}</p>
      {data.role_label ? <p className="text-sm">Rôle : {data.role_label}</p> : null}
      {data.period_label ? <p className="text-sm">Période : {data.period_label}</p> : null}
      {data.external_url ? <a href={data.external_url} className="text-sm font-semibold text-accent">Lien externe</a> : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {(media ?? []).map((item) => (
          <li key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/talents/fichier?id=${item.id}&type=portfolio`} alt="" className="w-full border border-line" />
          </li>
        ))}
      </ul>
      {user?.id === data.user_id ? <Link href={`/talents/moi/portfolio/${data.id}`} className="btn btn-line w-fit">Modifier</Link> : null}
      <ReportButton targetType="portfolio" targetId={data.id} path={`/talents/portfolio/${data.id}`} />
    </article>
  );
}
