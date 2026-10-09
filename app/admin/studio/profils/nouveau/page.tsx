import Link from "next/link";
import { EditorialProfileForm } from "@/components/admin/studio/EditorialProfileForm";
import { Etat } from "@/components/admin/studio/Etat";

export const dynamic = "force-dynamic";

export default async function NewEditorialProfilePage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  const { etat } = await searchParams;
  return (
    <div className="grid gap-4">
      <Link href="/admin/studio/profils" className="text-sm font-semibold">Tous les présentateurs</Link>
      <Etat code={etat} />
      <h2 className="text-2xl font-bold">Nouveau présentateur</h2>
      <p className="max-w-lg text-sm leading-6 text-muted">Ce profil aura sa propre page publique, comme un membre, sans devenir un compte de connexion.</p>
      <EditorialProfileForm />
    </div>
  );
}