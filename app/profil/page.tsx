import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/social/ProfileEditor";
import { getOwnProfile } from "@/lib/social/queries";

export const metadata: Metadata = { title: "Mon profil", robots: { index: false, follow: false } };

export default async function OwnProfilePage() {
  const profile = await getOwnProfile();
  if (!profile) redirect("/connexion?next=/profil");

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <p className="kicker">Compte</p>
      <h1 className="display mt-3 text-4xl text-ink">Mon profil</h1>
      <p className="mt-3 text-sm leading-6 text-muted">L&apos;adresse e-mail n&apos;apparaît pas sur le profil public.</p>
      <p className="mt-2 text-sm">
        <Link href={`/profil/${profile.username}`} className="font-semibold">
          Voir mon profil public
        </Link>
      </p>
      <div className="mt-8">
        <ProfileEditor profile={profile} />
      </div>
    </main>
  );
}
