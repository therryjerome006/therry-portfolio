import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialProfileForm } from "@/components/admin/studio/EditorialProfileForm";
import { Etat } from "@/components/admin/studio/Etat";
import { getProfile } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ etat?: string }> };

export default async function EditEditorialProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { etat } = await searchParams;
  if (id === "nouveau") notFound();
  const profile = await getProfile(id);
  if (!profile) notFound();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/admin/studio/profils" className="text-sm font-semibold">Tous les présentateurs</Link>
        <Link href={`/redaction/${profile.slug}`} className="text-sm font-semibold">Voir la page publique</Link>
      </div>
      <Etat code={etat} />
      <h2 className="text-2xl font-bold">Personnaliser {profile.name}</h2>
      <EditorialProfileForm profile={profile} />
    </div>
  );
}
