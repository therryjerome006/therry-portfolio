"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinCommunity, toggleBlock, toggleEditorialFollow, toggleFollow } from "@/lib/actions/network";

export function JoinButton({ communityId, joined }: { communityId: string; joined: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        className="btn btn-primary h-10 min-h-0 px-3"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await joinCommunity(communityId, !joined);
            if (result.auth) router.push(`/connexion?next=${encodeURIComponent(window.location.pathname)}`);
            else if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {joined ? "Quitter" : "Rejoindre"}
      </button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function FollowButton({ userId, editorialId, following, path }: { userId?: string; editorialId?: string; following: boolean; path: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <button
        type="button"
        className={following ? "btn btn-line h-10 min-h-0 px-3" : "btn btn-primary h-10 min-h-0 px-3"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = editorialId ? await toggleEditorialFollow(editorialId) : await toggleFollow(userId || "");
            if (result.auth) router.push(`/connexion?next=${encodeURIComponent(path)}`);
            else if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {following ? (editorialId ? "Suivi" : "Ne plus suivre") : "Suivre"}
      </button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function BlockButton({ userId, blocked, path }: { userId: string; blocked: boolean; path: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-sm font-semibold text-muted"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await toggleBlock(userId);
          if (result.auth) router.push(`/connexion?next=${encodeURIComponent(path)}`);
          else router.refresh();
        })
      }
    >
      {blocked ? "Débloquer" : "Bloquer"}
    </button>
  );
}
