// Keep this list aligned with public.contains_explicit in supabase/groups.sql.
const pattern =
  /(^|[^a-z0-9])(pornographie|pornographique|porno|porn|onlyfans|nudes|nude|sexuelle|sexuel|sexuels|sexy|erotique|erotisme|penis|vagin|vulve|masturbation|masturber|orgasme|fellation|sperme|ejaculation|ejaculer|niquer|nique|niques|baiser|baise|baises|chatte|chattes|couille|couilles|sextape|xxx|sexe|plan cul|sex tape|toute nue|tout nu|seins nus)([^a-z0-9]|$)/;

export const explicitMessage = "Les contenus pour adultes et les messages trop explicites ne sont pas autorisés.";

export function isExplicit(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("œ", "oe");
  return pattern.test(normalized);
}
