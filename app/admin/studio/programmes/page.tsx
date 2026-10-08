import { redirect } from "next/navigation";

export default async function ScheduledPage({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  const { etat } = await searchParams;
  redirect(`/admin/studio/bibliotheque?statut=scheduled${etat ? `&etat=${etat}` : ""}`);
}
