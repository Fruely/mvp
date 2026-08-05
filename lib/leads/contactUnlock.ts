/** Statuses that had full contact access before contact_unlock columns existed. */
const LEGACY_UNLOCKED_STATUSES = new Set(["accepted", "contacted", "closed"]);

export type LeadContactRow = {
  contact_unlocked_at?: string | null;
  status?: string | null;
};

export function isLeadContactUnlocked(lead: LeadContactRow): boolean {
  if (typeof lead.contact_unlocked_at === "string" && lead.contact_unlocked_at.trim()) {
    return true;
  }
  const status = (lead.status ?? "").trim().toLowerCase();
  return LEGACY_UNLOCKED_STATUSES.has(status);
}

const PREVIEW_MAX_LEN = 120;
export const LOCKED_CONTACT_MASK = "[контакт скрыт]";

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

/** Mask contact-like fragments in free text; does not mutate the source string. */
export function sanitizeLockedLeadPreview(message: unknown): string | null {
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (!trimmed) return null;

  let text = trimmed;

  text = text.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    LOCKED_CONTACT_MASK,
  );

  text = text.replace(/\bhttps?:\/\/[^\s]+/gi, LOCKED_CONTACT_MASK);
  text = text.replace(/\bwww\.[^\s]+/gi, LOCKED_CONTACT_MASK);

  text = text.replace(/\b(?:https?:\/\/)?t\.me\/[^\s]+/gi, LOCKED_CONTACT_MASK);
  text = text.replace(
    /\b(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com)\/[^\s]+/gi,
    LOCKED_CONTACT_MASK,
  );

  text = text.replace(/(?:^|\s)@[A-Za-z][A-Za-z0-9_]{4,31}\b/g, (match) =>
    match.trimStart() === match ? LOCKED_CONTACT_MASK : ` ${LOCKED_CONTACT_MASK}`,
  );

  text = text.replace(/\+\d(?:[\d\s().-]*\d){7,}/g, (match) =>
    countDigits(match) >= 9 && countDigits(match) <= 15 ? LOCKED_CONTACT_MASK : match,
  );

  text = text.replace(/(?:^|\s)(?:\+49|0049|0)(?:[\d\s()./-]*\d){8,}/g, (match) => {
    const digits = countDigits(match);
    if (digits < 9 || digits > 15) return match;
    return match.trimStart() === match ? LOCKED_CONTACT_MASK : ` ${LOCKED_CONTACT_MASK}`;
  });

  text = text.replace(/(?:^|\s)\(\d{2,5}\)(?:[\s.-]*\d){3,}/g, (match) => {
    const digits = countDigits(match);
    if (digits < 9 || digits > 15) return match;
    return match.trimStart() === match ? LOCKED_CONTACT_MASK : ` ${LOCKED_CONTACT_MASK}`;
  });

  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(
    new RegExp(`(?:${escapeRegExp(LOCKED_CONTACT_MASK)}\\s*)+`, "g"),
    `${LOCKED_CONTACT_MASK} `,
  ).trim();

  if (!text) return LOCKED_CONTACT_MASK;

  if (text.length <= PREVIEW_MAX_LEN) return text;
  return `${text.slice(0, PREVIEW_MAX_LEN).trimEnd()}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** @deprecated Use sanitizeLockedLeadPreview — kept for tests referencing the name. */
export function buildLeadMessagePreview(message: unknown): string | null {
  return sanitizeLockedLeadPreview(message);
}

export function formatLeadPublicId(leadId: string): string {
  const compact = leadId.replace(/-/g, "");
  if (compact.length >= 8) return `#${compact.slice(0, 8).toUpperCase()}`;
  return `#${leadId.slice(0, 8).toUpperCase()}`;
}

export const SPECIALIST_LEAD_TELEGRAM_TEXT =
  "🔔 У вас новая заявка на Freuly. Откройте кабинет, чтобы посмотреть запрос и связаться с клиентом.";

export const SPECIALIST_LEAD_REMINDER_TELEGRAM_TEXT =
  "⏰ У вас есть необработанная заявка на Freuly. Откройте кабинет, чтобы посмотреть запрос.";

export type DashboardLead = {
  id: string;
  status: string | null;
  created_at: string | null;
  source: string | null;
  source_path: string | null;
  contact_unlocked_at: string | null;
  contacts_unlocked: boolean;
  public_id: string;
  message_preview: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
};

type LeadDbRow = {
  id?: unknown;
  status?: unknown;
  created_at?: unknown;
  source?: unknown;
  source_path?: unknown;
  contact_unlocked_at?: unknown;
  client_name?: unknown;
  client_email?: unknown;
  client_phone?: unknown;
  message?: unknown;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function mapRowToDashboardLead(row: LeadDbRow): DashboardLead {
  const id = String(row.id);
  const unlocked = isLeadContactUnlocked({
    contact_unlocked_at: str(row.contact_unlocked_at),
    status: str(row.status),
  });
  const messageRaw = str(row.message);

  const base = {
    id,
    status: str(row.status),
    created_at: str(row.created_at),
    source: str(row.source),
    source_path: str(row.source_path),
    contact_unlocked_at: str(row.contact_unlocked_at),
    contacts_unlocked: unlocked,
    public_id: formatLeadPublicId(id),
    message_preview: unlocked ? null : sanitizeLockedLeadPreview(messageRaw),
    client_name: null as string | null,
    client_email: null as string | null,
    client_phone: null as string | null,
    message: null as string | null,
  };

  if (!unlocked) {
    return base;
  }

  return {
    ...base,
    client_name: str(row.client_name),
    client_email: str(row.client_email),
    client_phone: str(row.client_phone),
    message: messageRaw,
  };
}

/** Columns safe to load for redacted dashboard list (no contact PII columns). */
export const DASHBOARD_LEAD_REDACTED_SELECT =
  "id, status, created_at, source, source_path, contact_unlocked_at, message";

/** Full row for unlock endpoint / post-unlock refresh. */
export const DASHBOARD_LEAD_FULL_SELECT =
  "id, status, created_at, source, source_path, contact_unlocked_at, client_name, client_email, client_phone, message";
