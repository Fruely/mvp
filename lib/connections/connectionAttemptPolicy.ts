export const CONNECTION_FEE_AMOUNT_CENTS = 2500 as const;
export const CONNECTION_FEE_CURRENCY = "eur" as const;

export const CONNECTION_ATTEMPT_STATUSES = [
  "payment_required",
  "authorizing",
  "authorized",
  "client_confirmed",
  "capturing",
  "connected",
  "declined",
  "expired",
  "failed",
] as const;

export type ConnectionAttemptStatus = (typeof CONNECTION_ATTEMPT_STATUSES)[number];

const TERMINAL_STATUSES = new Set<ConnectionAttemptStatus>([
  "connected",
  "declined",
  "expired",
  "failed",
]);

const ALLOWED_TRANSITIONS: Record<ConnectionAttemptStatus, ReadonlySet<ConnectionAttemptStatus>> = {
  payment_required: new Set(["authorizing", "failed"]),
  authorizing: new Set(["payment_required", "authorized", "failed"]),
  authorized: new Set(["client_confirmed", "declined", "expired", "failed"]),
  client_confirmed: new Set(["capturing", "failed"]),
  capturing: new Set(["connected", "failed"]),
  connected: new Set(),
  declined: new Set(),
  expired: new Set(),
  failed: new Set(),
};

export function isConnectionAttemptStatus(value: unknown): value is ConnectionAttemptStatus {
  return (
    typeof value === "string" &&
    (CONNECTION_ATTEMPT_STATUSES as readonly string[]).includes(value)
  );
}

export function isTerminalConnectionAttemptStatus(status: ConnectionAttemptStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Same-state replay is intentionally accepted as an idempotent no-op.
 * Cross-state transitions are intentionally narrow; provider reconciliation
 * must never skip the required client-confirm/capture sequence.
 */
export function canTransitionConnectionAttempt(
  from: ConnectionAttemptStatus,
  to: ConnectionAttemptStatus,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].has(to);
}

export function requiresAuthorizedPaymentIntent(status: ConnectionAttemptStatus): boolean {
  return new Set<ConnectionAttemptStatus>([
    "authorized",
    "client_confirmed",
    "capturing",
    "connected",
    "declined",
    "expired",
  ]).has(status);
}

export function requiresClientConfirmation(status: ConnectionAttemptStatus): boolean {
  return status === "client_confirmed" || status === "capturing" || status === "connected";
}
