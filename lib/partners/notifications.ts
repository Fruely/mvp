import type { SupabaseClient } from "@supabase/supabase-js";

export type CommissionNotificationCopy = {
  type: "commission_accrual";
  title: string;
  body: string;
};

/** Format cents as "+29 €" style for notification titles. */
export function formatCommissionEuroTitle(amountCents: number, currency: string): string {
  const amount = (Math.max(0, amountCents) / 100).toFixed(amountCents % 100 === 0 ? 0 : 2);
  const cur = (currency || "EUR").toUpperCase();
  const symbol = cur === "EUR" ? "€" : cur;
  return `+${amount} ${symbol}`.replace(" .", " ");
}

/**
 * Pure notification copy builder (locale keys resolved by caller or defaults).
 * Defaults match product RU/UA/DE specs; callers pass localized strings when available.
 */
export function buildCommissionNotificationCopy(input: {
  amountCents: number;
  currency: string;
  titleTemplate: string;
  body: string;
}): CommissionNotificationCopy {
  const amountLabel = formatCommissionEuroTitle(input.amountCents, input.currency);
  const title = input.titleTemplate.replace("{{amount}}", amountLabel);
  return {
    type: "commission_accrual",
    title,
    body: input.body,
  };
}

export const DEFAULT_COMMISSION_NOTIFICATION = {
  ru: {
    titleTemplate: "Новое начисление: {{amount}}",
    body: "По вашей партнёрской ссылке оплатил новый специалист.",
  },
  ua: {
    titleTemplate: "Нове нарахування: {{amount}}",
    body: "За вашим партнерським посиланням оплатив новий спеціаліст.",
  },
  de: {
    titleTemplate: "Neue Gutschrift: {{amount}}",
    body: "Eine neue Fachkraft hat sich über Ihren Partnerlink registriert und bezahlt.",
  },
} as const;

/**
 * Idempotent by commission_id unique constraint.
 * Skips insert (with log) when partner has no user_id yet — commission still stands.
 */
export async function createCommissionNotification(
  supabase: SupabaseClient,
  input: {
    partnerId: string;
    userId: string | null;
    commissionId: string;
    amountCents: number;
    currency: string;
    locale?: "ru" | "ua" | "de";
  }
): Promise<{ created: boolean; skippedReason?: string }> {
  if (!input.userId) {
    console.info(
      "[partners/notifications] skip accrual notify: partner user_id not bound",
      input.partnerId
    );
    return { created: false, skippedReason: "no_user_id" };
  }

  const locale = input.locale ?? "ru";
  const tpl = DEFAULT_COMMISSION_NOTIFICATION[locale];
  const copy = buildCommissionNotificationCopy({
    amountCents: input.amountCents,
    currency: input.currency,
    titleTemplate: tpl.titleTemplate,
    body: tpl.body,
  });

  const { error } = await supabase.from("partner_notifications").insert({
    partner_id: input.partnerId,
    user_id: input.userId,
    type: copy.type,
    title: copy.title,
    body: copy.body,
    commission_id: input.commissionId,
  });

  if (error) {
    if (error.code === "23505") {
      return { created: false, skippedReason: "idempotent" };
    }
    console.error("[partners/notifications] insert failed", error.message);
    return { created: false, skippedReason: "insert_failed" };
  }

  return { created: true };
}

export async function markPartnerNotificationsRead(
  supabase: SupabaseClient,
  input: { partnerId: string; userId: string; notificationIds?: string[] | null }
): Promise<number> {
  const ts = new Date().toISOString();
  let query = supabase
    .from("partner_notifications")
    .update({ read_at: ts })
    .eq("partner_id", input.partnerId)
    .eq("user_id", input.userId)
    .is("read_at", null);

  if (input.notificationIds && input.notificationIds.length > 0) {
    query = query.in("id", input.notificationIds);
  }

  const { data, error } = await query.select("id");
  if (error) {
    console.error("[partners/notifications] mark read failed", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
