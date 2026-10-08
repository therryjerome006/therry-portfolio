"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removePost, toggleBlock, toggleEditorialFollow, toggleFollow, toggleSave } from "@/lib/actions/network";
import { deleteOwnAccount, updateOwnPost } from "@/lib/actions/social";

export function OwnPostTools({ id, body }: { id: string; body: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="mt-2 grid gap-2">
      <form
        className="grid gap-2"
        action={(formData) => {
          start(async () => {
            const result = await updateOwnPost(formData);
            setError(result.error || "");
            if (!result.error) router.refresh();
          });
        }}
      >
        <input type="hidden" name="id" value={id} />
        <textarea name="body" defaultValue={body} maxLength={500} rows={3} className="field" />
        <button type="submit" className="btn btn-line h-10 min-h-0 w-fit px-3" disabled={pending}>
          {pending ? "Enregistrement…" : "Modifier le texte"}
        </button>
      </form>
      <button
        type="button"
        className="w-fit text-sm font-semibold text-muted"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Supprimer cette publication ?")) return;
          start(async () => {
            const result = await removePost(id);
            setError(result.error || "");
            if (!result.error) router.refresh();
          });
        }}
      >
        Supprimer
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function DeletePostButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-sm font-semibold text-muted"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Supprimer cette publication ?")) return;
          start(async () => {
            const result = await removePost(id);
            setError(result.error || "");
            if (!result.error) router.refresh();
          });
        }}
      >
        Supprimer
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function UnfollowButton({ userId, editorialId }: { userId?: string; editorialId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-sm font-semibold text-muted"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (editorialId) await toggleEditorialFollow(editorialId);
          else if (userId) await toggleFollow(userId);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Ne plus suivre"}
    </button>
  );
}

export function UnsaveButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-sm font-semibold text-muted"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleSave(postId);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Retirer"}
    </button>
  );
}

export function UnblockButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="text-sm font-semibold"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await toggleBlock(userId);
          router.refresh();
        })
      }
    >
      Débloquer
    </button>
  );
}

export function DeleteAccountForm({ username }: { username: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-3 border border-line bg-white p-4"
      action={(formData) => {
        if (!window.confirm("Supprimer définitivement ce compte et ses publications ?")) return;
        start(async () => {
          const result = await deleteOwnAccount(formData);
          setError(result.error || "");
          if (!result.error) router.push("/");
        });
      }}
    >
      <h2 className="font-bold">Supprimer le compte</h2>
      <p className="text-sm leading-6 text-muted">Cette action retire le compte, ses publications, ses commentaires et ses abonnements. Les profils éditoriaux de TY Space ne sont pas concernés. Écrivez @{username} pour confirmer.</p>
      <input name="confirm" autoComplete="off" className="field" placeholder={username} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className="btn btn-line w-fit" disabled={pending}>
        {pending ? "Suppression…" : "Supprimer mon compte"}
      </button>
    </form>
  );
}
