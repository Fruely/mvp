import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assertClientSafeCapabilitiesDto,
  buildAccountCapabilitiesDto,
  mapSpecialistOverview,
  type AccountCapabilitiesDto,
  type AccountPartnerOverviewDto,
} from "@/lib/account/capabilitiesMapper";
import { getPartnerForUser } from "@/lib/partners/session";
import {
  getSpecialistOnboardingGateState,
  type SpecialistRow,
} from "@/lib/specialists/server";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";

const SPECIALIST_COLS =
  "id, user_id, name, category_id, status, is_active, is_visible, billing_visibility_blocked, is_test, work_format, slug, founder_badge";

function toSpecialistRow(row: Record<string, unknown> | null): SpecialistRow | null {
  if (!row) return null;
  const first_name = (row.name as string) ?? (row.first_name as string) ?? null;
  return { ...row, first_name } as SpecialistRow;
}

export async function resolveAccountCapabilities(
  userId: string,
  service: SupabaseClient,
  lang: AccountCapabilitiesLang,
): Promise<AccountCapabilitiesDto> {
  const [specResult, partnerRow] = await Promise.all([
    service
      .from("specialists")
      .select(SPECIALIST_COLS)
      .eq("user_id", userId)
      .neq("status", "blocked")
      .maybeSingle(),
    getPartnerForUser(userId, service),
  ]);

  if (specResult.error) {
    console.error("[account/capabilities] specialist lookup failed", specResult.error.message);
    throw new Error("specialist_lookup_failed");
  }

  const partner: AccountPartnerOverviewDto | null = partnerRow
    ? {
        id: partnerRow.id,
        status: partnerRow.status,
      }
    : null;

  const specialistRow = toSpecialistRow(specResult.data as Record<string, unknown> | null);
  if (!specialistRow) {
    return assertClientSafeCapabilitiesDto(
      buildAccountCapabilitiesDto({ specialist: null, partner }),
    );
  }

  const [profileResult, categoryResult, gate, plan] = await Promise.all([
    service
      .from("specialist_profiles")
      .select("city")
      .eq("specialist_id", specialistRow.id)
      .maybeSingle(),
    specialistRow.category_id
      ? service
          .from("categories")
          .select("slug, title, title_ru, title_de, title_ua")
          .eq("id", specialistRow.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    getSpecialistOnboardingGateState(specialistRow, service),
    getSpecialistPlanForDashboard(service, specialistRow.id),
  ]);

  const categoryLabel =
    categoryResult.data && typeof categoryResult.data === "object"
      ? getCategoryTitle(categoryResult.data, lang) || null
      : null;

  const specialist = mapSpecialistOverview({
    row: specialistRow,
    city: typeof profileResult.data?.city === "string" ? profileResult.data.city.trim() || null : null,
    categoryLabel,
    gate,
    planCode: plan.plan_code,
    planStatus: plan.plan_status,
    graceUntil: plan.grace_until,
  });

  return assertClientSafeCapabilitiesDto(
    buildAccountCapabilitiesDto({
      specialist,
      partner,
    }),
  );
}
