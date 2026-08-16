import type { SpecialistOnboardingGateState } from "@/lib/specialists/server";
import type { PublicServiceRadiusKm } from "@/lib/specialists/geography";

export const SPECIALIST_PROFILE_ALLOWED_LANGUAGE_CODES = ["ru", "uk", "de", "en", "pl"] as const;

export const SPECIALIST_PROFILE_EDITABLE_FIELDS = [
  "name",
  "about",
  "languages",
  "work_format",
  "country_code",
  "postal_code",
  "city",
  "lat",
  "lng",
  "service_radius_km",
  "category_id",
  "lang",
] as const;

export type SpecialistProfileCategoryOption = {
  id: string;
  slug: string;
  label: string;
  parent_id: string | null;
};

export type SpecialistEditableProfileDto = {
  id: string;
  name: string | null;
  category_id: string | null;
  category_slug: string | null;
  category_label: string | null;
  languages: string[];
  work_format: "online" | "offline" | "hybrid" | null;
  country_code: string | null;
  postal_code: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  service_radius_km: number | null;
  about: string | null;
  onboarding_gate: SpecialistOnboardingGateState;
  publication_ready: boolean;
  public_profile_available: boolean;
};

export type SpecialistProfileReadResponse = {
  specialist: SpecialistEditableProfileDto;
  category_options: SpecialistProfileCategoryOption[];
  allowed_service_radii_km: PublicServiceRadiusKm[];
  allowed_language_codes: readonly string[];
};

export type SpecialistProfilePatchBody = Partial<{
  name: string;
  about: string;
  languages: string[];
  work_format: "online" | "offline" | "hybrid";
  country_code: string;
  postal_code: string;
  city: string;
  lat: number;
  lng: number;
  service_radius_km: number | string | null;
  category_id: string | null;
  lang: string;
}>;

export type SpecialistProfilePatchResult = {
  specialist: SpecialistEditableProfileDto;
  warning?: string;
};
