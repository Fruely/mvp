import type { LockScreenPush } from "./message";

export type PushEndpointTarget = {
  id: string;
  token: string;
  platform: "ios" | "android";
  provider: "expo";
};

export type PushSendResult = {
  status: "sent" | "retryable" | "failed" | "skipped";
  errorCode: string | null;
  providerMessageId: string | null;
  invalidate: boolean;
};

export type PushTransport = {
  deliver(message: LockScreenPush, endpoint: PushEndpointTarget): Promise<PushSendResult>;
};

export function classifyPushProviderError(input: {
  httpStatus: number | null;
  providerError: string | null;
}): PushSendResult {
  const code = input.providerError ?? "";
  if (code === "DeviceNotRegistered" || code === "InvalidToken" || code === "unregistered") {
    return { status: "failed", errorCode: "push_invalid_token", providerMessageId: null, invalidate: true };
  }
  if (code === "MessageRateExceeded" || input.httpStatus === 429 || (input.httpStatus !== null && input.httpStatus >= 500)) {
    return { status: "retryable", errorCode: "push_temporary", providerMessageId: null, invalidate: false };
  }
  return { status: "failed", errorCode: "push_rejected", providerMessageId: null, invalidate: false };
}

export function isExpoPushConfigured(): boolean {
  return Boolean(process.env.EXPO_PUSH_ACCESS_TOKEN?.trim());
}

type ExpoTicket = {
  status?: string;
  id?: string;
  message?: string;
  details?: { error?: string };
};

export function createExpoPushTransport(fetchImpl: typeof fetch = fetch): PushTransport {
  return {
    async deliver(message, endpoint) {
      if (!isExpoPushConfigured()) {
        return { status: "skipped", errorCode: "push_not_configured", providerMessageId: null, invalidate: false };
      }
      let response: Response;
      try {
        response = await fetchImpl("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: endpoint.token,
            title: message.title,
            body: message.body,
            data: {
              eventType: message.eventType,
              entityId: message.entityId,
              deepLink: message.deepLink,
              locale: message.locale,
            },
            badge: message.badge ?? undefined,
            priority: message.priority === "high" ? "high" : "default",
            sound: "default",
          }),
        });
      } catch {
        return { status: "retryable", errorCode: "push_temporary", providerMessageId: null, invalidate: false };
      }
      if (response.status === 429 || response.status >= 500) {
        return classifyPushProviderError({ httpStatus: response.status, providerError: null });
      }
      let ticket: ExpoTicket | null = null;
      try {
        const payload = (await response.json()) as { data?: ExpoTicket | ExpoTicket[] };
        ticket = Array.isArray(payload.data) ? payload.data[0] ?? null : payload.data ?? null;
      } catch {
        ticket = null;
      }
      if (!response.ok) {
        return classifyPushProviderError({
          httpStatus: response.status,
          providerError: ticket?.details?.error ?? "push_rejected",
        });
      }
      if (ticket?.status === "error") {
        const classified = classifyPushProviderError({
          httpStatus: response.status,
          providerError: ticket.details?.error ?? "push_rejected",
        });
        return classified;
      }
      if (ticket?.status === "ok") {
        return {
          status: "sent",
          errorCode: null,
          providerMessageId: ticket.id ?? null,
          invalidate: false,
        };
      }
      return { status: "failed", errorCode: "push_rejected", providerMessageId: null, invalidate: false };
    },
  };
}
