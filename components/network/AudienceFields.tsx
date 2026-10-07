import { ageBands, type AgeBand } from "@/lib/network/constants";

export function AudienceFields({ choices, defaults }: { choices: AgeBand[]; defaults: AgeBand[] }) {
  const selected = new Set<string>(defaults);
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">Qui peut voir et interagir</legend>
      {ageBands
        .filter((band) => choices.includes(band.value))
        .map((band) => (
          <label key={band.value} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="audience" value={band.value} defaultChecked={selected.has(band.value)} />
            {band.label}
          </label>
        ))}
      <p className="text-xs leading-5 text-muted">Les contenus pour adultes et les messages trop explicites sont interdits.</p>
    </fieldset>
  );
}
