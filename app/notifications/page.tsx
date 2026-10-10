import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { markNotificationsRead } from "@/lib/actions/network";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user || !supabase) redirect("/connexion?next=/notifications");
  const { data } = await supabase.from("notifications").select("id, kind, content_type, content_id, note, created_at, read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40);
  await markNotificationsRead();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <ul className="mt-4 grid gap-2">
        {(data ?? []).map((item) => {
          const href = item.content_type === "talent" && item.content_id
            ? item.note?.includes("accept")
              ? `/talents/moi/projets/${item.content_id}`
              : item.kind === "talent_request"
                ? "/talents/moi/projets"
                : `/talents/opportunites/${item.content_id}`
            : item.content_type === "feed" && item.content_id ? `/p/${item.content_id}` : "/notifications";
          const label = item.kind === "follow"
            ? "Quelqu'un vous suit."
            : item.kind === "comment"
              ? "Nouveau commentaire sur votre publication."
              : item.kind === "group_warning"
                ? "Avertissement de l'administration."
                : item.kind === "group_closed"
                  ? "Votre groupe a été fermé."
                  : item.kind === "group_reopened"
                    ? "Votre groupe a été rouvert."
                    : "Nouvelle activité.";
          return (
            <li key={item.id}>
              <Link href={href} className={`block border border-line px-4 py-3 text-sm ${item.read_at ? "bg-white" : "bg-[#f4f8ff]"}`}>
                {label}
                {item.note ? <span className="mt-1 block">{item.note}</span> : null}
                <time className="mt-1 block text-xs text-muted" dateTime={item.created_at}>
                  {formatRelative(item.created_at)}
                </time>
              </Link>
            </li>
          );
        })}
      </ul>
      {(data ?? []).length === 0 ? <p className="mt-4 text-sm text-muted">Pas encore de notification.</p> : null}
    </div>
  );
}
