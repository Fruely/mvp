export const CLIENT_SELECTION_POLICY = {
  interestDigestDelayMs: 2 * 60 * 1000,
  clientReminderMs: 6 * 60 * 60 * 1000,
  maxClientReminders: 1,
  accessTokenTtlMs: 30 * 24 * 60 * 60 * 1000,
  messageMaxLength: 2000,
} as const;

export const SELECTABLE_REQUEST_STATUSES = ["new", "reviewing", "searching", "matched"] as const;

export function interestInboxKey(matchId: string): string {
  return `match:${matchId}:specialist_interested`;
}

export function interestDigestKey(requestId: string, generation: number): string {
  return `request:${requestId}:interest_digest:${generation}`;
}

export function connectionInboxKey(requestId: string): string {
  return `request:${requestId}:connection_ready`;
}

export function selectedSpecialistInboxKey(matchId: string): string {
  return `match:${matchId}:client_selected`;
}

export function clientReminderKey(requestId: string): string {
  return `request:${requestId}:client_reminder:1`;
}

export function clientRequestPath(locale: string, publicId: string): string {
  const safeLocale = /^[a-z]{2,3}$/.test(locale) ? locale : "ru";
  return `/${safeLocale}/requests/${publicId}`;
}

export function conversationPath(locale: string, conversationId: string, side: "client" | "specialist", publicId?: string): string {
  const safeLocale = /^[a-z]{2,3}$/.test(locale) ? locale : "ru";
  if (side === "specialist") {
    return `/${safeLocale}/specialist/dashboard/conversations/${conversationId}`;
  }
  return `/${safeLocale}/requests/${publicId ?? conversationId}/conversation`;
}

/** One pending digest per request. A later burst starts only after the previous one is no longer pending. */
export function nextDigestGeneration(input: { pending: boolean; sentCount: number }): number | null {
  if (input.pending) return null;
  return input.sentCount + 1;
}

export function clientReminderDue(input: {
  firstResponseAt: Date | null;
  selectedAt: Date | null;
  alreadySent: boolean;
  now: Date;
  delayMs?: number;
}): boolean {
  if (input.alreadySent || input.selectedAt || !input.firstResponseAt) return false;
  const delay = input.delayMs ?? CLIENT_SELECTION_POLICY.clientReminderMs;
  return input.now.getTime() - input.firstResponseAt.getTime() >= delay;
}

export type SelectionError = "forbidden" | "not_selectable" | "already_selected";

export function selectionDecision(input: {
  requestClientUserId: string | null;
  actorUserId: string | null;
  anonymousAccess: boolean;
  requestStatus: string;
  selectedSpecialistId: string | null;
  specialistId: string;
  matchStatus: string | null;
}): { ok: true } | { ok: false; error: SelectionError } {
  const owns = input.actorUserId
    ? input.requestClientUserId === input.actorUserId
    : input.anonymousAccess && input.requestClientUserId === null;
  if (!owns) return { ok: false, error: "forbidden" };
  if (!(SELECTABLE_REQUEST_STATUSES as readonly string[]).includes(input.requestStatus)) {
    return { ok: false, error: "not_selectable" };
  }
  if (input.selectedSpecialistId && input.selectedSpecialistId !== input.specialistId) {
    return { ok: false, error: "already_selected" };
  }
  if (input.selectedSpecialistId === input.specialistId) return { ok: true };
  if (input.matchStatus !== "interested") return { ok: false, error: "not_selectable" };
  return { ok: true };
}

export function conversationRole(input: {
  clientUserId: string | null;
  specialistId: string;
  requestId: string;
  actorUserId: string | null;
  actorSpecialistId: string | null;
  anonymousRequestId: string | null;
}): "client" | "specialist" | null {
  if (input.actorSpecialistId && input.actorSpecialistId === input.specialistId) return "specialist";
  if (input.actorUserId && input.clientUserId && input.actorUserId === input.clientUserId) return "client";
  if (!input.clientUserId && input.anonymousRequestId === input.requestId) return "client";
  return null;
}

export type ClientRequestPhase =
  | "searching"
  | "responses_received"
  | "specialist_selected"
  | "connected"
  | "completed"
  | "cancelled";

export function clientRequestPhase(input: {
  status: string;
  interestedCount: number;
  selected: boolean;
  connected: boolean;
}): ClientRequestPhase {
  if (input.status === "cancelled" || input.status === "spam") return "cancelled";
  if (input.status === "closed") return "completed";
  if (input.connected) return "connected";
  if (input.selected) return "specialist_selected";
  if (input.interestedCount > 0) return "responses_received";
  return "searching";
}
