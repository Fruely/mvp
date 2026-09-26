import { createHash } from "node:crypto";

const EXPO_TOKEN = /^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,128}\]$/;
const DEVICE_ID = /^[A-Za-z0-9_-]{8,80}$/;

export function hashPushToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isExpoPushToken(value: unknown): value is string {
  return typeof value === "string" && EXPO_TOKEN.test(value.trim());
}

export function isDeviceId(value: unknown): value is string {
  return typeof value === "string" && DEVICE_ID.test(value.trim());
}

export function pushLogRecord(input: {
  outboxId?: string | null;
  recipientUserId?: string | null;
  provider?: string | null;
  platform?: string | null;
  endpointId?: string | null;
  attempt?: number | null;
  durationMs?: number | null;
  outcome?: string | null;
  errorCode?: string | null;
  token?: string | null;
  email?: string | null;
}): Record<string, string | number | null> {
  return {
    outboxId: input.outboxId ?? null,
    recipientUserId: input.recipientUserId ?? null,
    provider: input.provider ?? null,
    platform: input.platform ?? null,
    endpointId: input.endpointId ?? null,
    attempt: input.attempt ?? null,
    durationMs: input.durationMs ?? null,
    outcome: input.outcome ?? null,
    errorCode: input.errorCode ?? null,
  };
}
