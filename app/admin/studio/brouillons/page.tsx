import { redirect } from "next/navigation";

export default async function DraftsPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  const { etat } = await searchParams;
  redirect(`/admin/studio/bibliotheque?statut=draft${etat ? `&etat=${etat}` : ""}`);
}
