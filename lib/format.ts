export function formatDate(value: string) {
  const date = new Date(value);
  const dateOnly =
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : undefined,
  }).format(date);
}

export function readingLabel(minutes: number) {
  return `${minutes} min de lecture`;
}
