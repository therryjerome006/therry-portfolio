import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileActivity } from "@/components/network/ProfileActivity";
import { ProfileEditor } from "@/components/social/ProfileEditor";
import { loadProfileActivity } from "@/lib/network/feed";
import { getOwnProfile } from "@/lib/social/queries";

export const metadata: Metadata = { title: "Mon profil", robots: { index: false, follow: false } };

export default async function OwnProfilePage() {
  const profile = await getOwnProfile();
  if (!profile) redirect("/connexion?next=/profil");
  const activity = await loadProfileActivity(profile.id, profile.id);
  const path = `/profil/${profile.username}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <p className="kicker">Compte</p>
      <h1 className="display mt-3 text-4xl text-ink">Mon profil</h1>
      <p className="mt-3 text-sm leading-6 text-muted">L&apos;adresse e-mail n&apos;apparaît pas sur le profil public.</p>
      <p className="mt-2 text-sm">
        <Link href={path} className="font-semibold">
          Voir mon profil public
        </Link>
      </p>
      <section className="mt-10">
        <h2 className="text-lg font-bold">Mon activité</h2>
        <div className="mt-3">
          <ProfileActivity activity={activity} mine path={path} />
        </div>
      </section>
      <div className="mt-10">
        <ProfileEditor profile={profile} />
      </div>
    </main>
  );
}
