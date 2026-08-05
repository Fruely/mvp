export async function checkRateLimit() {
  return { allowed: true };
}

export function getClientIP() {
  return "127.0.0.1";
}

export const RATE_LIMIT_PUBLIC_MESSAGE = "Too many requests";
