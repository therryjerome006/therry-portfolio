const failures = new Map<string, { count: number; until: number }>();
const LIMIT = 8;
const WINDOW_MS = 15 * 60 * 1000;

export function loginBlocked(key: string) {
  const row = failures.get(key);
  if (!row) return false;
  if (Date.now() > row.until) {
    failures.delete(key);
    return false;
  }
  return row.count >= LIMIT;
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const row = failures.get(key);
  if (!row || now > row.until) {
    failures.set(key, { count: 1, until: now + WINDOW_MS });
    return;
  }
  row.count += 1;
  row.until = now + WINDOW_MS;
}

export function clearLoginFailures(key: string) {
  failures.delete(key);
}
