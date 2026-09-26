export type MatchInboxPayload = {
  match_id: string;
  service_request_id: string;
  stage: "initial" | "reminder" | "final";
  reminder_index: number;
  service_label: string;
  work_format: string | null;
  city: string | null;
  service_languages: string[];
  opened: boolean;
};

const ALLOWED_KEYS: (keyof MatchInboxPayload)[] = [
  "match_id",
  "service_request_id",
  "stage",
  "reminder_index",
  "service_label",
  "work_format",
  "city",
  "service_languages",
  "opened",
];

export function safeMatchPayload(input: MatchInboxPayload): MatchInboxPayload {
  const payload = {} as MatchInboxPayload;
  for (const key of ALLOWED_KEYS) {
    (payload as Record<string, unknown>)[key] = input[key];
  }
  return payload;
}

export function canReadInbox(recipientUserId: string, actorUserId: string | null): boolean {
  return Boolean(actorUserId) && actorUserId === recipientUserId;
}
