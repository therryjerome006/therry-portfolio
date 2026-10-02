"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle } from "lucide-react";
import { addComment, editComment, moreComments, removeComment, toggleLike } from "@/lib/actions/social";
import type { ContentType } from "@/lib/social/content";
import type { EngagementData, PublicComment } from "@/lib/social/queries";
import { formatDate } from "@/lib/format";

function initials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function AuthPrompt({ path }: { path: string }) {
  const next = encodeURIComponent(path);
  return (
    <div className="border border-line bg-[#f7fbff] px-4 py-4" role="dialog" aria-label="Connexion requise">
      <p className="text-sm font-semibold text-ink">Connectez-vous pour interagir avec ce contenu.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/connexion?next=${next}`} className="btn btn-primary h-10 min-h-0 px-3">
          Se connecter
        </Link>
        <Link href={`/inscription?next=${next}`} className="btn btn-line h-10 min-h-0 px-3">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  replies,
  userId,
  path,
  onReply,
  onAuth,
}: {
  comment: PublicComment;
  replies: PublicComment[];
  userId: string | null;
  path: string;
  onReply: (id: string) => void;
  onAuth: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.body);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const mine = userId === comment.userId;
  const edited = comment.updatedAt !== comment.createdAt;

  return (
    <li className="border-t border-line py-4">
      <div className="flex gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#e4edf8] text-sm font-bold text-ink" aria-hidden="true">
          {comment.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comment.author.avatarUrl} alt="" className="h-9 w-9 object-cover" />
          ) : (
            initials(comment.author.displayName)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Link href={`/profil/${comment.author.username}`} className="font-bold text-ink">
              {comment.author.displayName}
            </Link>
            <time className="ml-2 text-xs text-muted" dateTime={comment.createdAt}>
              {formatDate(comment.createdAt)}
              {edited ? " · modifié" : ""}
            </time>
          </p>
          {editing ? (
            <form
              className="mt-2 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                start(async () => {
                  const result = await editComment(comment.id, text, path);
                  if (result.auth) onAuth();
                  else if (result.error) setError(result.error);
                  else setEditing(false);
                });
              }}
            >
              <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={3} className="field" />
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary h-10 min-h-0 px-3" disabled={pending}>
                  Enregistrer
                </button>
                <button type="button" className="btn btn-line h-10 min-h-0 px-3" onClick={() => setEditing(false)}>
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-ink">{comment.body}</p>
          )}
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
          <div className="mt-2 flex gap-3 text-xs font-semibold">
            {!comment.parentId ? (
              <button type="button" className="text-muted" onClick={() => (userId ? onReply(comment.id) : onAuth())}>
                Répondre
              </button>
            ) : null}
            {mine ? (
              <>
                <button type="button" className="text-muted" onClick={() => setEditing(true)}>
                  Modifier
                </button>
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => {
                    if (!window.confirm("Supprimer ce commentaire ?")) return;
                    start(async () => {
                      const result = await removeComment(comment.id, path);
                      if (result.auth) onAuth();
                      else if (result.error) setError(result.error);
                    });
                  }}
                >
                  Supprimer
                </button>
              </>
            ) : null}
          </div>
          {replies.length > 0 ? (
            <ul className="mt-3 border-l border-line pl-4">
              {replies.map((reply) => (
                <CommentItem key={reply.id} comment={reply} replies={[]} userId={userId} path={path} onReply={onReply} onAuth={onAuth} />
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function EngagementPanel({
  type,
  id,
  path,
  initial,
}: {
  type: ContentType;
  id: string;
  path: string;
  initial: EngagementData;
}) {
  const [liked, setLiked] = useState(initial.liked);
  const [count, setCount] = useState(initial.count);
  const [comments, setComments] = useState(initial.comments);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [authOpen, setAuthOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const anchor = `${path.split("#")[0]}#interactions`;
  const stamp = `${initial.count}:${initial.liked}:${initial.userId ?? ""}:${initial.comments.map((item) => item.id + item.updatedAt).join(",")}`;

  useEffect(() => {
    setLiked(initial.liked);
    setCount(initial.count);
    setComments(initial.comments);
    setHasMore(initial.hasMore);
  }, [stamp]);

  const roots = comments.filter((comment) => !comment.parentId);
  const repliesOf = (parentId: string) => comments.filter((comment) => comment.parentId === parentId);

  function like() {
    if (!initial.userId) {
      setAuthOpen(true);
      return;
    }
    setError("");
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((value) => value + (nextLiked ? 1 : -1));
    start(async () => {
      const result = await toggleLike(type, id, path);
      if (result.auth) {
        setLiked(!nextLiked);
        setCount((value) => value + (nextLiked ? -1 : 1));
        setAuthOpen(true);
      } else if (result.error) {
        setLiked(!nextLiked);
        setCount((value) => value + (nextLiked ? -1 : 1));
        setError(result.error);
      }
    });
  }

  return (
    <section id="interactions" className="mt-8 border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={like}
          aria-pressed={liked}
          className={`inline-flex h-10 items-center gap-2 border px-3 text-sm font-semibold ${liked ? "border-[#9f1239] bg-[#fff1f4] text-[#9f1239]" : "border-line text-ink"}`}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} aria-hidden="true" />
          {count} j&apos;aime
        </button>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
          <MessageCircle size={16} aria-hidden="true" />
          {comments.length}
          {hasMore ? "+" : ""} commentaire{comments.length > 1 ? "s" : ""}
        </p>
      </div>

      {authOpen ? (
        <div className="mt-4">
          <AuthPrompt path={anchor} />
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <ul className="mt-2">
        {roots.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replies={repliesOf(comment.id)}
            userId={initial.userId}
            path={path}
            onReply={(commentId) => {
              setReplyTo(commentId);
              setAuthOpen(false);
            }}
            onAuth={() => setAuthOpen(true)}
          />
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          className="btn btn-line mt-3 h-10 min-h-0 px-3"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const page = await moreComments(type, id, comments.length);
              setComments((current) => {
                const seen = new Set(current.map((item) => item.id));
                return [...current, ...page.comments.filter((item) => !seen.has(item.id))];
              });
              setHasMore(page.hasMore);
            });
          }}
        >
          Voir plus de commentaires
        </button>
      ) : null}

      {initial.userId ? (
        <form
          className="mt-4 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            start(async () => {
              const result = await addComment(type, id, draft, replyTo, path);
              if (result.auth) setAuthOpen(true);
              else if (result.error) setError(result.error);
              else {
                setDraft("");
                setReplyTo(null);
                router.refresh();
              }
            });
          }}
        >
          {replyTo ? <p className="text-xs font-semibold text-muted">Réponse à un commentaire</p> : null}
          <label className="grid gap-2 text-sm font-semibold">
            Commentaire
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              rows={3}
              required
              className="field"
              placeholder="Votre commentaire porte sur cette publication."
            />
          </label>
          <button type="submit" className="btn btn-primary h-10 w-fit min-h-0 px-3" disabled={pending}>
            {pending ? "Publication…" : "Publier"}
          </button>
        </form>
      ) : (
        <button type="button" className="mt-4 text-sm font-semibold text-ink underline underline-offset-4" onClick={() => setAuthOpen(true)}>
          Commenter
        </button>
      )}
    </section>
  );
}
