"use client";

export default function TalentsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel grid gap-3 p-4">
      <h1 className="text-xl font-bold">Talents n'a pas pu s'afficher</h1>
      <p className="text-sm text-muted">Réessayez. Si le problème continue, la connexion à la base est peut-être indisponible.</p>
      <button type="button" className="btn btn-primary w-fit" onClick={() => reset()}>Réessayer</button>
    </div>
  );
}
