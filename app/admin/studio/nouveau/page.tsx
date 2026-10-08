import { Composer } from "@/components/admin/studio/Composer";
import { Etat } from "@/components/admin/studio/Etat";
import { getSettings, listProfiles } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ etat?: string }> };

export default async function NewEditorialPage({ searchParams }: Props) {
  const { etat } = await searchParams;
  const [profiles, settings] = await Promise.all([listProfiles(false), getSettings()]);
  const usable = profiles.filter((profile) => profile.isActive && !profile.archivedAt);
  return (
    <div className="grid gap-4">
      <Etat code={etat} />
      {usable.length === 0 ? <p className="text-sm">Créez d&apos;abord un profil éditorial actif.</p> : <Composer profiles={usable} timezone={settings.timezone} />}
    </div>
  );
}
