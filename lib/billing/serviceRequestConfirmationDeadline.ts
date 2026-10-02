import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-owned confirmation window for one reserved service-request claim.
 * The duration is configuration. Clients do not send it, and this module has no default.
 */
export const SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS = "SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS";

export function parseServiceRequestConfirmationWindowSeconds(
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const raw = env[SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^[1-9][0-9]*$/.test(trimmed)) return null;
  const seconds = Number(trimmed);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return null;
  return seconds;
}

export function confirmationDeadlineFrom(authorizedAt: Date, windowSeconds: number): string | null {
  const authorizedMs = authorizedAt.getTime();
  if (!Number.isFinite(authorizedMs) || !Number.isFinite(windowSeconds) || windowSeconds <= 0) return null;
  const expiresMs = authorizedMs + windowSeconds * 1000;
  if (!Number.isFinite(expiresMs)) return null;
  const deadline = new Date(expiresMs);
  if (!Number.isFinite(deadline.getTime())) return null;
  return deadline.toISOString();
}

export function storedConfirmationDeadline(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return value;
}

export function isConfirmationDeadlineOpen(value: unknown, now: Date = new Date()): boolean {
  const stored = storedConfirmationDeadline(value);
  if (!stored) return false;
  return Date.parse(stored) > now.getTime();
}

export type PersistConfirmationDeadlineResult =
  | { ok: true; confirmationExpiresAt: string }
  | { ok: false; error: "confirmation_window_unconfigured" | "retryable" };

/**
 * Writes confirmation_expires_at once, from the server authorization time.
 * A later call returns the stored timestamp and does not move it.
 */
export async function readStoredConfirmationDeadline(
  supabase: SupabaseClient,
  claimId: string,
): Promise<{ ok: true; confirmationExpiresAt: string | null } | { ok: false; error: "retryable" }> {
  const result = await supabase
    .from("service_request_claims")
    .select("confirmation_expires_at")
    .eq("id", claimId)
    .maybeSingle();
  if (result.error) return { ok: false, error: "retryable" };
  return {
    ok: true,
    confirmationExpiresAt: storedConfirmationDeadline(
      (result.data as { confirmation_expires_at?: unknown } | null)?.confirmation_expires_at,
    ),
  };
}

export async function persistConfirmationDeadline(input: {
  supabase: SupabaseClient;
  claimId: string;
  authorizedAt: Date;
  env?: NodeJS.ProcessEnv;
}): Promise<PersistConfirmationDeadlineResult> {
  const existing = await input.supabase
    .from("service_request_claims")
    .select("id, status, confirmation_expires_at")
    .eq("id", input.claimId)
    .maybeSingle();
  if (existing.error) return { ok: false, error: "retryable" };
  const row = existing.data as { status?: string; confirmation_expires_at?: unknown } | null;
  if (!row || row.status !== "reserved") return { ok: false, error: "retryable" };
  const stored = storedConfirmationDeadline(row.confirmation_expires_at);
  if (stored) return { ok: true, confirmationExpiresAt: stored };
  if (row.confirmation_expires_at != null) return { ok: false, error: "retryable" };

  const windowSeconds = parseServiceRequestConfirmationWindowSeconds(input.env ?? process.env);
  if (windowSeconds == null) return { ok: false, error: "confirmation_window_unconfigured" };

  const confirmationExpiresAt = confirmationDeadlineFrom(input.authorizedAt, windowSeconds);
  if (!confirmationExpiresAt) return { ok: false, error: "confirmation_window_unconfigured" };
  const updated = await input.supabase
    .from("service_request_claims")
    .update({
      confirmation_expires_at: confirmationExpiresAt,
      updated_at: input.authorizedAt.toISOString(),
    })
    .eq("id", input.claimId)
    .eq("status", "reserved")
    .is("confirmation_expires_at", null);
  if (updated.error) return { ok: false, error: "retryable" };

  const reread = await input.supabase
    .from("service_request_claims")
    .select("confirmation_expires_at")
    .eq("id", input.claimId)
    .maybeSingle();
  if (reread.error) return { ok: false, error: "retryable" };
  const persisted = storedConfirmationDeadline(
    (reread.data as { confirmation_expires_at?: unknown } | null)?.confirmation_expires_at,
  );
  if (!persisted) return { ok: false, error: "retryable" };
  return { ok: true, confirmationExpiresAt: persisted };
}
