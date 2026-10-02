import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getProfileByUsername } from "@/lib/social/queries";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return {};
  return { title: profile.displayName, description: profile.bio || `Profil de ${profile.displayName}` };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <p className="kicker">Profil</p>
      <div className="mt-4 flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center bg-[#e4edf8] text-2xl font-bold text-ink">
          {profile.avatarUrl ? (
            // Server-rendered remote avatar. next/image needs a known host, so a plain image keeps any https avatar.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-16 w-16 object-cover" />
          ) : (
            profile.displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        <div>
          <h1 className="display text-4xl text-ink">{profile.displayName}</h1>
          <p className="text-sm font-semibold text-muted">@{profile.username}</p>
        </div>
      </div>
      {profile.bio ? <p className="mt-6 leading-7 text-ink">{profile.bio}</p> : null}
      <p className="mt-4 text-sm text-muted">Inscrit le {formatDate(profile.createdAt)}</p>
    </main>
  );
}
