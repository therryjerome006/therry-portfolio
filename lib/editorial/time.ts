import { editorialTimezones } from "@/lib/editorial/constants";

export function isTimezone(value: string) {
  return editorialTimezones.some((zone) => zone === value);
}

function parts(date: Date, timeZone: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(formatted.map((part) => [part.type, part.value]));
  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
    hour: Number(value.hour) % 24,
    minute: Number(value.minute),
    second: Number(value.second),
  };
}

function zoneOffset(date: Date, timeZone: string) {
  const local = parts(date, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  return asUtc - date.getTime();
}

export function zonedLocalToUtc(local: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const guess = new Date(`${local}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  const first = new Date(guess.getTime() - zoneOffset(guess, timeZone));
  return new Date(first.getTime() - zoneOffset(first, timeZone) + zoneOffset(guess, timeZone));
}

export function dayKey(date: Date, timeZone: string) {
  const local = parts(date, timeZone);
  return `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

export function formatInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function nextLocalMorning(date: Date, timeZone: string) {
  const local = parts(date, timeZone);
  const morning = zonedLocalToUtc(
    `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}T08:00`,
    timeZone,
  );
  if (!morning) return new Date(date.getTime() + 24 * 60 * 60 * 1000);
  if (morning.getTime() > date.getTime()) return morning;
  return new Date(morning.getTime() + 24 * 60 * 60 * 1000);
}

export function planSlots(start: Date, count: number, timeZone: string, maxPerDay: number, intervalMinutes: number, taken: Date[]) {
  const slots: Date[] = [];
  let cursor = new Date(start.getTime());
  let steps = 0;
  while (slots.length < count && steps < count * 80) {
    steps += 1;
    const key = dayKey(cursor, timeZone);
    const used = [...taken, ...slots].filter((item) => dayKey(item, timeZone) === key).length;
    if (used >= maxPerDay) {
      cursor = nextLocalMorning(new Date(cursor.getTime() + 24 * 60 * 60 * 1000), timeZone);
      continue;
    }
    const close = [...taken, ...slots].some((item) => Math.abs(item.getTime() - cursor.getTime()) < intervalMinutes * 60 * 1000);
    if (close) {
      cursor = new Date(cursor.getTime() + intervalMinutes * 60 * 1000);
      continue;
    }
    slots.push(new Date(cursor.getTime()));
    cursor = new Date(cursor.getTime() + intervalMinutes * 60 * 1000);
  }
  return slots;
}
