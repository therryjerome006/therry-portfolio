"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import { toggleSave } from "@/lib/actions/network";
import { toggleLike } from "@/lib/actions/social";
import { ReportButton } from "@/components/network/ReportButton";

export function FeedActions({
  postId,
  kind,
  likeCount,
  commentCount,
  liked,
  saved,
  path,
  showLike = true,
  canSave = true,
}: {
  postId: string;
  kind: "text" | "photo" | "video";
  likeCount: number;
  commentCount: number;
  liked: boolean;
  saved: boolean;
  path: string;
  showLike?: boolean;
  canSave?: boolean;
}) {
  const [state, setState] = useState({ liked, likeCount, saved });
  const [prompt, setPrompt] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const next = encodeURIComponent(path);
  const reportType = kind === "text" ? "post" : kind;

  function like() {
    const previous = state;
    setState({ ...state, liked: !state.liked, likeCount: state.likeCount + (state.liked ? -1 : 1) });
    start(async () => {
      const result = await toggleLike("feed", postId, path);
      if (result.auth) {
        setState(previous);
        setPrompt(true);
      } else if (result.error) {
        setState(previous);
        setNote(result.error);
      }
    });
  }

  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
        {showLike ? (
          <button type="button" className={`inline-flex items-center gap-1 ${state.liked ? "text-rose-600" : "text-muted"}`} aria-pressed={state.liked} onClick={like} disabled={pending}>
            <Heart size={16} fill={state.liked ? "currentColor" : "none"} />
            {state.likeCount}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted">
            <Heart size={16} />
            {likeCount}
          </span>
        )}
        <Link href={`${path}#interactions`} className="inline-flex items-center gap-1 text-muted">
          <MessageCircle size={16} />
          {commentCount}
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-muted"
          onClick={async () => {
            const url = `${window.location.origin}/p/${postId}`;
            if (navigator.share) {
              await navigator.share({ url }).catch(() => undefined);
              return;
            }
            await navigator.clipboard.writeText(url);
            setNote("Lien copié.");
          }}
        >
          <Share2 size={16} />
          Partager
        </button>
        {canSave ? <button
          type="button"
          className={`inline-flex items-center gap-1 ${state.saved ? "text-accent" : "text-muted"}`}
          aria-pressed={state.saved}
          onClick={() => {
            const previous = state.saved;
            setState({ ...state, saved: !state.saved });
            start(async () => {
              const result = await toggleSave(postId);
              if (result.auth) {
                setState((value) => ({ ...value, saved: previous }));
                setPrompt(true);
              } else if (result.error) {
                setState((value) => ({ ...value, saved: previous }));
                setNote(result.error);
              }
            });
          }}
        >
          <Bookmark size={16} fill={state.saved ? "currentColor" : "none"} />
          Enregistrer
        </button> : null}
      </div>
      <ReportButton targetType={reportType} targetId={postId} path={path} />
      {prompt ? (
        <p className="text-sm text-ink">
          Connectez-vous pour interagir avec ce contenu.{" "}
          <Link href={`/connexion?next=${next}`} className="font-semibold">
            Se connecter
          </Link>
        </p>
      ) : null}
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
  );
}
