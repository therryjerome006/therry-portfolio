import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountForm, DeletePostButton, OwnPostTools, UnblockButton, UnfollowButton, UnsaveButton } from "@/components/account/AccountTools";
import { ProfileActivity } from "@/components/network/ProfileActivity";
import { PostCard } from "@/components/network/PostCard";
import { ProfileEditor } from "@/components/social/ProfileEditor";
import { formatDate } from "@/lib/format";
import { loadProfileActivity } from "@/lib/network/feed";
import { getOwnProfile } from "@/lib/social/queries";
import { loadOwnHub, relationCounts } from "@/lib/social/space";

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

function contentHref(type: string, id: string) {
  if (type === "feed" || type === "post") return `/p/${id}`;
  if (type === "article") return `/articles/${id}`;
  return "";
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
  const matches = (name: string, username: string) => !search || name.toLowerCase().includes(search) || username.toLowerCase().includes(search);

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[14rem_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Espace personnel">
        {sections.map(([id, label]) => (
          <Link key={id} href={id === "apercu" ? "/profil" : `/profil?espace=${id}`} className={`shrink-0 border px-3 py-2 text-sm font-semibold ${section === id ? "border-accent text-accent" : "border-line text-muted"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">
        {section === "apercu" ? (
          <section className="grid gap-4">
            <h1 className="text-3xl font-bold">Mon profil</h1>
            <p className="text-sm leading-6 text-muted">L&apos;adresse e-mail, le téléphone et la tranche d&apos;âge ne sont pas visibles sur le profil public.</p>
            <p className="text-sm"><span className="font-bold">{hub.publicationCount}</span> {hub.publicationCount === 1 ? "publication" : "publications"} · <span className="font-bold">{counts.followers}</span> {counts.followers === 1 ? "abonné" : "abonnés"} · <span className="font-bold">{counts.following}</span> {counts.following === 1 ? "abonnement" : "abonnements"}</p>
            <p className="text-xs text-muted">Inscrit le {formatDate(profile.createdAt)}</p>
            <Link href={path} className="w-fit font-semibold">Voir mon profil public</Link>
            <ProfileActivity activity={activity} mine path={path} />
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
              <Link key={article.id} href={`/articles/${article.id}`} className="border border-line bg-white p-4 font-semibold">{article.title}</Link>
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
          <section>
            <h1 className="text-3xl font-bold">Mes médias</h1>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[...hub.photos, ...hub.videos].map((post) => (
                <Link key={post.id} href={`/p/${post.id}`} className="block border border-line bg-white">
                  {post.media?.mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.media.url} alt="" className="aspect-square w-full object-cover" />
                  ) : null}
                  {post.media?.mediaType === "video" ? <video src={post.media.url} className="aspect-square w-full bg-black object-cover" muted /> : null}
                  <span className="block p-2 text-xs font-semibold">{post.kind === "video" ? "Vidéo" : "Photo"}</span>
                </Link>
              ))}
            </div>
            {hub.photos.length + hub.videos.length === 0 ? <p className="mt-4 text-sm text-muted">Aucune photo ni vidéo publiée.</p> : null}
          </section>
        ) : null}
        {section === "interactions" ? (
          <section className="grid gap-6">
            <h1 className="text-3xl font-bold">Mes interactions</h1>
            <div>
              <h2 className="font-bold">Commentaires</h2>
              <ul className="mt-2 grid gap-2 text-sm">
                {hub.comments.length === 0 ? <li className="text-muted">Aucun commentaire.</li> : null}
                {hub.comments.map((comment) => {
                  const href = contentHref(comment.content_type, comment.content_id);
                  return <li key={comment.id}>{href ? <Link href={href} className="font-semibold">{comment.body.slice(0, 140)}</Link> : comment.body.slice(0, 140)}</li>;
                })}
              </ul>
            </div>
            <div>
              <h2 className="font-bold">Réponses reçues</h2>
              <ul className="mt-2 grid gap-2 text-sm">
                {hub.replies.length === 0 ? <li className="text-muted">Aucune réponse pour le moment.</li> : null}
                {hub.replies.map((reply) => {
                  const href = contentHref(reply.content_type, reply.content_id);
                  return <li key={reply.id}>{href ? <Link href={href}>{reply.body.slice(0, 140)}</Link> : reply.body.slice(0, 140)}</li>;
                })}
              </ul>
            </div>
            <div>
              <h2 className="font-bold">Publications aimées</h2>
              <ul className="mt-2 grid gap-2 text-sm">
                {hub.likes.length === 0 ? <li className="text-muted">Aucun j&apos;aime.</li> : null}
                {hub.likes.map((like) => {
                  const href = contentHref(like.content_type, like.content_id);
                  return <li key={`${like.content_type}-${like.content_id}`}>{href ? <Link href={href} className="font-semibold">Ouvrir la publication</Link> : "Contenu retiré"}</li>;
                })}
              </ul>
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
            <div>
              <h2 className="font-bold">Abonnés</h2>
              <ul className="mt-2 grid gap-2 text-sm">
                {hub.followers.filter((person) => matches(person.name, person.username)).map((person) => (
                  <li key={person.id}><Link href={`/profil/${person.username}`} className="font-semibold">{person.name}</Link> <span className="text-muted">@{person.username}</span></li>
                ))}
                {hub.followers.length === 0 ? <li className="text-muted">Aucun abonné.</li> : null}
              </ul>
            </div>
            <div>
              <h2 className="font-bold">Comptes suivis</h2>
              <ul className="mt-2 grid gap-2 text-sm">
                {hub.following.filter((person) => matches(person.name, person.username)).map((person) => (
                  <li key={person.id} className="flex flex-wrap items-center gap-3">
                    <Link href={`/profil/${person.username}`} className="font-semibold">{person.name}</Link>
                    <UnfollowButton userId={person.id} />
                  </li>
                ))}
                {hub.editorial.filter((person) => matches(person.name, person.slug)).map((person) => (
                  <li key={person.id} className="flex flex-wrap items-center gap-3">
                    <Link href={`/redaction/${person.slug}`} className="font-semibold">{person.name}</Link>
                    <span className="text-xs font-bold uppercase text-accent">Éditorial</span>
                    <UnfollowButton editorialId={person.id} />
                  </li>
                ))}
                {hub.following.length + hub.editorial.length === 0 ? <li className="text-muted">Vous ne suivez encore personne.</li> : null}
              </ul>
            </div>
          </section>
        ) : null}
        {section === "enregistrements" ? (
          <section>
            <h1 className="text-3xl font-bold">Contenus enregistrés</h1>
            <p className="mt-2 text-sm text-muted">Cette liste n&apos;est visible que par vous.</p>
            <ul className="mt-4 grid gap-2">
              {hub.saved.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-line bg-white p-3 text-sm">
                  <Link href={item.href} className="font-semibold">{item.title}</Link>
                  <UnsaveButton postId={item.id} />
                </li>
              ))}
              {hub.saved.length === 0 ? <li className="text-sm text-muted">Aucun contenu enregistré.</li> : null}
            </ul>
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
              <ul className="mt-2 grid gap-2 text-sm">
                {hub.blocked.length === 0 ? <li className="text-muted">Aucun compte bloqué.</li> : null}
                {hub.blocked.map((person) => (
                  <li key={person.id} className="flex items-center gap-3">
                    <span>{person.name}</span>
                    <UnblockButton userId={person.id} />
                  </li>
                ))}
              </ul>
            </div>
            <DeleteAccountForm username={profile.username} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
