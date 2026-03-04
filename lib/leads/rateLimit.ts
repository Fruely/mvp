const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;

type Entry = {
  startsAt: number;
  count: number;
};

const store = new Map<string, Entry>();

export function getLeadRateLimitKey(ip: string, specialistId: string): string {
  return `${ip}:${specialistId}`;
}

export function consumeLeadRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now - existing.startsAt > WINDOW_MS) {
    store.set(key, { startsAt: now, count: 1 });
    return { allowed: true };
  }
  if (existing.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - existing.startsAt)) / 1000);
    return { allowed: false, retryAfterSec };
  }
  existing.count += 1;
  return { allowed: true };
}
