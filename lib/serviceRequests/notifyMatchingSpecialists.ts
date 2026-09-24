import "server-only";

import { sendTelegramMessage } from "@/lib/telegram/sendMessage";
import { matchesForYouRequest } from "@/lib/serviceRequests/forYouRequests";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PromotionNotificationInput = {
  serviceRequestId: string;
  publicToken: string;
  title: string;
  summary: string;
  city: string | null;
  workFormat: string | null;
  preferredLanguage: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function notifyMatchingSpecialistsAboutPromotion(
  input: PromotionNotificationInput,
): Promise<void> {
  const service = createSupabaseServerClient();
  const [{ data: request }, { data: specialists }, { data: plans }] = await Promise.all([
    service.from("service_requests").select("category_id, preferred_language, work_format, city").eq("id", input.serviceRequestId).maybeSingle(),
    service.from("specialists").select("id, telegram_chat_id, category_id, languages, work_format, status").not("telegram_chat_id", "is", null).neq("status", "blocked"),
    service.from("specialist_plan").select("specialist_id").in("plan_code", ["basic", "premium"]).in("plan_status", ["active", "grace", "grace_period"]),
  ]);
  if (!request || !specialists?.length || !plans?.length) return;

  const paid = new Set(plans.map((row) => String(row.specialist_id)));
  const specialistIds = specialists.filter((row) => paid.has(String(row.id))).map((row) => String(row.id));
  const [{ data: services }, { data: profiles }] = await Promise.all([
    service.from("specialist_services").select("specialist_id, category_id").in("specialist_id", specialistIds).eq("is_active", true),
    service.from("specialist_profiles").select("specialist_id, city").in("specialist_id", specialistIds),
  ]);
  const categories = new Map<string, string[]>();
  for (const row of services ?? []) {
    const list = categories.get(String(row.specialist_id)) ?? [];
    if (typeof row.category_id === "string") list.push(row.category_id);
    categories.set(String(row.specialist_id), list);
  }
  const cities = new Map((profiles ?? []).map((row) => [String(row.specialist_id), asString(row.city)]));
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://freuly.de"}/ru/specialist/dashboard/requests/for-you`;
  const message = `Новая подходящая заявка на Freuly\\n\\n${input.title}\\n${input.summary}${input.city ? `\\n\\nМесто: ${input.city}` : ""}`;
  await Promise.all(
    specialists
      .filter((specialist) => paid.has(String(specialist.id)) && specialist.telegram_chat_id)
      .filter((specialist) =>
        matchesForYouRequest({
          requestCategoryId: asString(request.category_id),
          requestLanguage: asString(request.preferred_language),
          requestFormat: asString(request.work_format),
          requestCity: asString(request.city),
          specialistCategoryIds: [
            asString(specialist.category_id),
            ...(categories.get(String(specialist.id)) ?? []),
          ].filter((value): value is string => Boolean(value)),
          specialistLanguages: Array.isArray(specialist.languages) ? specialist.languages : [],
          specialistFormat: asString(specialist.work_format),
          specialistCity: cities.get(String(specialist.id)) ?? null,
        }),
      )
      .map((specialist) => sendTelegramMessage(specialist.telegram_chat_id as string, message, url)),
  );
}
