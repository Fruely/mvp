import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import type { SpecialistOnboardingGateState } from "@/lib/specialists/server";

export const SPECIALIST_MEDIA_BUCKET = "specialist-avatars";
export const SPECIALIST_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const SPECIALIST_MEDIA_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type SpecialistMediaReadiness = {
  onboarding_gate: SpecialistOnboardingGateState;
  publication_ready: boolean;
  public_profile_available: boolean;
};

export type SpecialistMediaDto = {
  profile_photo_url: string | null;
  gallery_urls: string[];
  gallery_count: number;
  gallery_limit: number;
  gallery_enabled: boolean;
  can_upload_gallery: boolean;
  gallery_over_limit: boolean;
  public_gallery_urls: string[];
  effective_paid_plan: "basic" | "premium" | null;
};

export type SpecialistMediaPageResponse = {
  data: SpecialistMediaDto;
} & SpecialistMediaReadiness;

export type SpecialistMediaMutationResponse = {
  data: SpecialistMediaDto;
} & SpecialistMediaReadiness;

export type SpecialistMediaLang = AccountCapabilitiesLang;
