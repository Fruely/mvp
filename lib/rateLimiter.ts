// Simple in-memory rate limiter by IP
// Tracks failed attempts to prevent brute-force password guessing

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5; // Max failed password attempts per IP
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown after max attempts

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  locked?: boolean;
  lockedUntil?: number;
}

const attempts: Map<string, AttemptRecord> = new Map();

// Parse whitelist from env (comma-separated IPs)
function getWhitelistedIPs(): Set<string> {
  const whitelist = process.env.NEXT_PUBLIC_ADMIN_IP_WHITELIST || "";
  return new Set(whitelist.split(",").map((ip) => ip.trim()).filter(Boolean));
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

export function isWhitelisted(ip: string): boolean {
  const whitelist = getWhitelistedIPs();
  return whitelist.size > 0 && whitelist.has(ip);
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  // Skip rate limiting for whitelisted IPs
  if (isWhitelisted(ip)) {
    return { allowed: true };
  }

  const now = Date.now();
  const record = attempts.get(ip);

  // Clean up old records
  if (record && now - record.firstAttempt > WINDOW_MS && !record.locked) {
    attempts.delete(ip);
    return { allowed: true };
  }

  // Check if locked
  if (record?.locked && record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  // Unlock if cooldown expired
  if (record?.locked && record.lockedUntil && now >= record.lockedUntil) {
    attempts.delete(ip);
    return { allowed: true };
  }

  // Check attempt count
  if (record && record.count >= MAX_ATTEMPTS) {
    record.locked = true;
    record.lockedUntil = now + COOLDOWN_MS;
    return { allowed: false, retryAfter: Math.ceil(COOLDOWN_MS / 1000) };
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
  // Skip for whitelisted IPs
  if (isWhitelisted(ip)) {
    return;
  }

  const now = Date.now();
  const record = attempts.get(ip);

  if (!record) {
    attempts.set(ip, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
  } else {
    // Reset if outside window
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.set(ip, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
    } else {
      record.count += 1;
      record.lastAttempt = now;
    }
  }
}

export function clearAttempt(ip: string): void {
  attempts.delete(ip);
}
