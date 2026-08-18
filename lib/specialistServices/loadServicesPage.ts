import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import type { SpecialistServicesContext } from "@/lib/specialistServices/context";
import { mapServiceRow } from "@/lib/specialistServices/mapServiceRow";
import { loadSpecialistServicesReadiness } from "@/lib/specialistServices/readiness";
import { SERVICE_SELECT, type SpecialistServicesReadResponse } from "@/lib/specialistServices/types";

export async function loadSpecialistServicesPage(
  ctx: Extract<SpecialistServicesContext, { kind: "ok" }>,
  lang: AccountCapabilitiesLang,
): Promise<SpecialistServicesReadResponse> {
  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .select(SERVICE_SELECT)
    .eq("specialist_id", ctx.specialistId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[specialistServices] GET failed", error);
    throw new Error("services_load_failed");
  }

  const { readiness, specialistCategory } = await loadSpecialistServicesReadiness(
    ctx.supabase,
    ctx.specialistId,
    lang,
  );

  return {
    data: (data ?? []).map((row) => mapServiceRow(row as Record<string, unknown>)),
    specialist_category: specialistCategory,
    onboarding_gate: readiness.onboarding_gate,
    publication_ready: readiness.publication_ready,
    public_profile_available: readiness.public_profile_available,
  };
}
