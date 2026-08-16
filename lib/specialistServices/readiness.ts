import type { SupabaseClient } from "@supabase/supabase-js";

import { getCategoryTitle } from "@/lib/getCategoryTitle";
import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import {
  getSpecialistOnboardingGateState,
  type SpecialistRow,
} from "@/lib/specialists/server";
import { isPublicLeadTargetSpecialist } from "@/lib/specialists/status";
import type {
  SpecialistServicesReadiness,
  SpecialistCategorySummary,
} from "@/lib/specialistServices/types";

export async function loadSpecialistServicesReadiness(
  supabase: SupabaseClient,
  specialistId: string,
  lang: AccountCapabilitiesLang,
): Promise<{
  readiness: SpecialistServicesReadiness;
  specialistCategory: SpecialistCategorySummary | null;
}> {
  const { data: specialist } = await supabase
    .from("specialists")
    .select(
      "id, name, category_id, status, is_active, is_visible, billing_visibility_blocked, is_test, slug",
    )
    .eq("id", specialistId)
    .maybeSingle();

  if (!specialist?.id) {
    throw new Error("specialist_not_found");
  }

  const categoryId = typeof specialist.category_id === "string" ? specialist.category_id : null;
  let specialistCategory: SpecialistCategorySummary | null = null;

  if (categoryId) {
    const { data: categoryRow } = await supabase
      .from("categories")
      .select("id, slug, title, title_ru, title_de, title_ua")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryRow && typeof categoryRow.id === "string") {
      specialistCategory = {
        id: categoryRow.id,
        slug: typeof categoryRow.slug === "string" ? categoryRow.slug : null,
        label: getCategoryTitle(categoryRow, lang) || null,
      };
    }
  }

  const specialistRow: SpecialistRow = {
    id: specialistId,
    user_id: null,
    first_name: typeof specialist.name === "string" ? specialist.name : null,
    name: typeof specialist.name === "string" ? specialist.name : null,
    email: null,
    phone: null,
    category_id: categoryId,
    status: typeof specialist.status === "string" ? specialist.status : null,
  };

  const gate = await getSpecialistOnboardingGateState(specialistRow, supabase);
  const slug = typeof specialist.slug === "string" && specialist.slug.trim() ? specialist.slug.trim() : null;
  const publicProfileAvailable =
    Boolean(slug) &&
    isPublicLeadTargetSpecialist({
      status: typeof specialist.status === "string" ? specialist.status : null,
      is_active: specialist.is_active === true,
      is_visible: specialist.is_visible === true,
      billing_visibility_blocked: specialist.billing_visibility_blocked === true,
      is_test: specialist.is_test === true,
    });

  return {
    readiness: {
      onboarding_gate: gate.state,
      publication_ready: gate.publicationReady,
      public_profile_available: publicProfileAvailable,
    },
    specialistCategory,
  };
}
