import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountForm, DeletePostButton, OwnPostTools, UnblockButton } from "@/components/account/AccountTools";
import { ArticleCard } from "@/components/journal/ArticleCard";
import { FollowButton } from "@/components/network/JoinButton";
import { PersonCard } from "@/components/network/PersonCard";
import { ProfileActivity } from "@/components/network/ProfileActivity";
import { ProfileHeader } from "@/components/network/ProfileHeader";
import { PostCard } from "@/components/network/PostCard";
import { ProfileEditor } from "@/components/social/ProfileEditor";
import { categoryLabel } from "@/lib/editorial/constants";
import { formatDate, formatRelative } from "@/lib/format";
import { loadProfileActivity } from "@/lib/network/feed";
import { getOwnProfile } from "@/lib/social/queries";
import { loadOwnHub, relationCounts, type ProfileNote } from "@/lib/social/space";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon espace", robots: { index: false, follow: false } };

const sections = [
  ["apercu", "Mon profil"],
  ["modifier", "Modifier"],
  ["publications", "Publications"],
  ["medias", "Médias"],
  ["interactions", "Interactions"],
  ["relations", "Abonnements"],
  ["enregistrements", "Enregistrés"],
  ["reglages", "Réglages"],
] as const;

type Section = (typeof sections)[number][0];

function NoteCard({ note }: { note: ProfileNote }) {
  return (
    <article className="grid gap-3">
      <p className="text-sm leading-6">
        <span className="font-semibold">{note.body}</span>
        <span className="text-muted"> · {formatRelative(note.createdAt)}</span>
      </p>
      {note.post ? <PostCard post={note.post} /> : null}
      {note.article ? <ArticleCard {...note.article} /> : null}
      {!note.post && !note.article ? <p className="text-sm text-muted">Le contenu d&apos;origine n&apos;est plus accessible.</p> : null}
    </article>
  );
}

export default async function OwnProfilePage({ searchParams }: { searchParams: Promise<{ espace?: string; q?: string }> }) {
  const query = await searchParams;
  const profile = await getOwnProfile();
  if (!profile) {
    const next = sections.some((item) => item[0] === query.espace) ? `/profil?espace=${query.espace}` : "/profil";
    redirect(`/connexion?next=${encodeURIComponent(next)}`);
  }
  const section: Section = sections.some((item) => item[0] === query.espace) ? (query.espace as Section) : "apercu";
  const search = (query.q || "").trim().toLowerCase();
  const [activity, hub, counts] = await Promise.all([
    loadProfileActivity(profile.id, profile.id),
    loadOwnHub(profile.id),
    relationCounts(profile.id),
  ]);
  const path = `/profil/${profile.username}`;
  const relationsPath = "/profil?espace=relations";
  const followedIds = new Set(hub.following.map((person) => person.id));
  const matches = (name: string, username: string) => !search || name.toLowerCase().includes(search) || username.toLowerCase().includes(search);

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[15rem_1fr]">
      <nav className="section-tabs lg:static lg:flex-col lg:overflow-visible lg:bg-surface" aria-label="Espace personnel">
        {sections.map(([id, label]) => (
          <Link key={id} href={id === "apercu" ? "/profil" : `/profil?espace=${id}`} className="section-tab lg:w-full" aria-current={section === id ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">
        {section === "apercu" ? (
          <section className="grid gap-4">
            <ProfileHeader
              name={profile.displayName}
              handle={profile.username}
              avatarUrl={profile.avatarUrl}
              bio={profile.bio}
              extra={profile.interests}
              website={profile.website}
              note={`Inscrit le ${formatDate(profile.createdAt)}. L'adresse e-mail, le téléphone et la tranche d'âge restent privés.`}
              stats={[
                { value: hub.publicationCount, label: hub.publicationCount === 1 ? "publication" : "publications" },
                { value: counts.followers, label: counts.followers === 1 ? "abonné" : "abonnés" },
                { value: counts.following, label: counts.following === 1 ? "abonnement" : "abonnements" },
              ]}
              actions={
                <>
                  <Link href={path} className="btn btn-line">Voir le profil public</Link>
                  <Link href="/talents/moi" className="btn btn-primary">Espace Talents</Link>
                </>
              }
            />
            <ProfileActivity activity={activity} mine path={path} />
            <div className="grid gap-3">
              {hub.posts.slice(0, 3).map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        ) : null}
        {section === "modifier" ? (
          <section>
            <h1 className="text-3xl font-bold">Modifier mon profil</h1>
            <div className="mt-6 max-w-lg"><ProfileEditor profile={profile} /></div>
          </section>
        ) : null}
        {section === "publications" ? (
          <section className="grid gap-4">
            <h1 className="text-3xl font-bold">Mes publications</h1>
            {hub.articles.map((article) => (
              <ArticleCard key={article.id} {...article} />
            ))}
            {hub.posts.map((post) => (
              <div key={post.id}>
                <PostCard post={post} />
                {post.kind === "text" ? <OwnPostTools id={post.id} body={post.body} /> : <DeletePostButton id={post.id} />}
              </div>
            ))}
            {hub.publicationCount > hub.posts.length ? <p className="text-sm text-muted">Les 24 publications les plus récentes sont affichées.</p> : null}
            {hub.posts.length === 0 && hub.articles.length === 0 ? <p className="text-sm text-muted">Aucune publication pour le moment.</p> : null}
          </section>
        ) : null}
        {section === "medias" ? (
          <section className="grid gap-4">
            <h1 className="text-3xl font-bold">Mes médias</h1>
            {[...hub.photos, ...hub.videos].map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {hub.photos.length + hub.videos.length === 0 ? <p className="text-sm text-muted">Aucune photo ni vidéo publiée.</p> : null}
          </section>
        ) : null}
        {section === "interactions" ? (
          <section className="grid gap-6">
            <h1 className="text-3xl font-bold">Mes interactions</h1>
            <div className="grid gap-4">
              <h2 className="font-bold">Commentaires</h2>
              {hub.comments.length === 0 ? <p className="text-sm text-muted">Aucun commentaire.</p> : null}
              {hub.comments.map((note) => <NoteCard key={note.id} note={note} />)}
            </div>
            <div className="grid gap-4">
              <h2 className="font-bold">Réponses reçues</h2>
              {hub.replies.length === 0 ? <p className="text-sm text-muted">Aucune réponse pour le moment.</p> : null}
              {hub.replies.map((note) => <NoteCard key={note.id} note={note} />)}
            </div>
            <div className="grid gap-4">
              <h2 className="font-bold">Publications aimées</h2>
              {hub.likes.length === 0 ? <p className="text-sm text-muted">Aucun j&apos;aime.</p> : null}
              {hub.likes.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          </section>
        ) : null}
        {section === "relations" ? (
          <section className="grid gap-6">
            <h1 className="text-3xl font-bold">Abonnements</h1>
            <p className="text-sm"><span className="font-bold">{counts.followers}</span> abonnés · <span className="font-bold">{counts.following}</span> abonnements</p>
            <form className="flex gap-2">
              <input type="hidden" name="espace" value="relations" />
              <input name="q" defaultValue={query.q || ""} placeholder="Rechercher un nom" className="field" />
              <button type="submit" className="btn btn-line">Chercher</button>
            </form>
            <div className="grid gap-3">
              <h2 className="font-bold">Abonnés</h2>
              {hub.followers.filter((person) => matches(person.name, person.username)).map((person) => (
                <PersonCard
                  key={person.id}
                  href={`/profil/${person.username}`}
                  name={person.name}
                  username={person.username}
                  avatarUrl={person.avatarUrl}
                  bio={person.bio}
                  action={<FollowButton userId={person.id} following={followedIds.has(person.id)} path={relationsPath} />}
                />
              ))}
              {hub.followers.length === 0 ? <p className="text-sm text-muted">Aucun abonné.</p> : null}
            </div>
            <div className="grid gap-3">
              <h2 className="font-bold">Comptes suivis</h2>
              {hub.following.filter((person) => matches(person.name, person.username)).map((person) => (
                <PersonCard
                  key={person.id}
                  href={`/profil/${person.username}`}
                  name={person.name}
                  username={person.username}
                  avatarUrl={person.avatarUrl}
                  bio={person.bio}
                  action={<FollowButton userId={person.id} following path={relationsPath} />}
                />
              ))}
              {hub.editorial.filter((person) => matches(person.name, person.slug)).map((person) => (
                <PersonCard
                  key={person.id}
                  href={`/redaction/${person.slug}`}
                  name={person.name}
                  username={person.slug}
                  avatarUrl={person.avatarUrl}
                  bio={person.description}
                  badge={categoryLabel(person.category)}
                  action={<FollowButton editorialId={person.id} following path={relationsPath} />}
                />
              ))}
              {hub.following.length + hub.editorial.length === 0 ? <p className="text-sm text-muted">Vous ne suivez encore personne.</p> : null}
            </div>
          </section>
        ) : null}
        {section === "enregistrements" ? (
          <section>
            <h1 className="text-3xl font-bold">Contenus enregistrés</h1>
            <p className="mt-2 text-sm text-muted">Cette liste n&apos;est visible que par vous.</p>
            <div className="mt-4 grid gap-3">
              {hub.saved.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {hub.savedArticles.map((article) => (
                <ArticleCard key={article.id} {...article} />
              ))}
              {hub.saved.length + hub.savedArticles.length === 0 ? <p className="text-sm text-muted">Aucun contenu enregistré.</p> : null}
            </div>
          </section>
        ) : null}
        {section === "reglages" ? (
          <section className="grid max-w-lg gap-6">
            <h1 className="text-3xl font-bold">Réglages</h1>
            <div className="grid gap-2 text-sm">
              <Link href="/notifications" className="font-semibold">Voir les notifications</Link>
              <Link href="/compte/mot-de-passe" className="font-semibold">Changer le mot de passe</Link>
              <p className="text-muted">Le thème clair ou sombre se règle depuis l&apos;en-tête. L&apos;e-mail n&apos;est pas affiché.</p>
            </div>
            <div>
              <h2 className="font-bold">Comptes bloqués</h2>
              <div className="mt-2 grid gap-3">
                {hub.blocked.length === 0 ? <p className="text-sm text-muted">Aucun compte bloqué.</p> : null}
                {hub.blocked.map((person) => (
                  <PersonCard
                    key={person.id}
                    href={`/profil/${person.username}`}
                    name={person.name}
                    username={person.username}
                    avatarUrl={person.avatarUrl}
                    bio={person.bio}
                    action={<UnblockButton userId={person.id} />}
                  />
                ))}
              </div>
            </div>
            <DeleteAccountForm username={profile.username} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
