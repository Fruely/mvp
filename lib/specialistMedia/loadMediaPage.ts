import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import {
  canAddGalleryImage,
  normalizeGalleryUrls,
  resolveSpecialistEntitlements,
  selectPublicGalleryUrls,
} from "@/lib/billing/planEntitlements";
import { loadSpecialistMediaReadiness } from "@/lib/specialistMedia/readiness";
import type { SpecialistMediaDto, SpecialistMediaPageResponse } from "@/lib/specialistMedia/types";

function resolveProfilePhotoUrl(
  avatarUrl: string | null | undefined,
  photoUrl: string | null | undefined,
): string | null {
  const avatar = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
  const photo = typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : null;
  return avatar ?? photo;
}

export async function loadSpecialistMediaPage(
  supabase: SupabaseClient,
  specialistId: string,
  lang: AccountCapabilitiesLang,
): Promise<SpecialistMediaPageResponse> {
  const [specialistResult, profileResult, planResult, readiness] = await Promise.all([
    supabase.from("specialists").select("avatar_url").eq("id", specialistId).maybeSingle(),
    supabase.from("specialist_profiles").select("photo_url, gallery_urls").eq("specialist_id", specialistId).maybeSingle(),
    supabase.from("specialist_plan").select("plan_code, plan_status").eq("specialist_id", specialistId).maybeSingle(),
    loadSpecialistMediaReadiness(supabase, specialistId, lang),
  ]);

  if (specialistResult.error || !specialistResult.data) {
    throw new Error("specialist_not_found");
  }

  const row = specialistResult.data;
  const profile = profileResult.data;

  const entitlements = resolveSpecialistEntitlements({
    plan_code: typeof planResult.data?.plan_code === "string" ? planResult.data.plan_code : "starter",
    plan_status: typeof planResult.data?.plan_status === "string" ? planResult.data.plan_status : "early_access",
  });
  const galleryUrls = normalizeGalleryUrls(profile?.gallery_urls);
  const galleryCount = galleryUrls.length;
  const galleryLimit = entitlements.galleryLimit;
  const canUploadGallery = canAddGalleryImage(galleryCount, galleryLimit);

  const data: SpecialistMediaDto = {
    profile_photo_url: resolveProfilePhotoUrl(
      typeof row.avatar_url === "string" ? row.avatar_url : null,
      typeof profile?.photo_url === "string" ? profile.photo_url : null,
    ),
    gallery_urls: galleryUrls,
    gallery_count: galleryCount,
    gallery_limit: galleryLimit,
    gallery_enabled: true,
    can_upload_gallery: canUploadGallery,
    gallery_over_limit: galleryCount > galleryLimit,
    public_gallery_urls: selectPublicGalleryUrls(galleryUrls, entitlements.galleryPublicLimit),
    effective_paid_plan: entitlements.effectivePaidPlan,
  };

  return {
    data,
    ...readiness,
  };
}
