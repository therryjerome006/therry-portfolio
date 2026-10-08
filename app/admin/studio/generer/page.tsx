import { GenerateForm } from "@/components/admin/studio/GenerateForm";
import { Etat } from "@/components/admin/studio/Etat";
import { aiConfigured } from "@/lib/editorial/ai";
import { listProfiles } from "@/lib/editorial/store";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ etat?: string }> };

export default async function GeneratePage({ searchParams }: Props) {
  const { etat } = await searchParams;
  const profiles = (await listProfiles(false)).filter((profile) => profile.isActive);
  return (
    <div className="grid max-w-xl gap-4">
      <Etat code={etat} />
      <p className="text-sm leading-6 text-muted">Les textes générés restent des brouillons. Rien n&apos;est publié sans votre validation. Les actualités, chiffres et dates doivent être vérifiés.</p>
      <GenerateForm profiles={profiles} enabled={aiConfigured()} />
    </div>
  );
}
