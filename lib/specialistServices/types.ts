export type SpecialistOnboardingGateState = "incomplete" | "ready" | "published";

export const ALLOWED_PRICING_TYPES = ["fixed", "range", "hourly"] as const;
export type PricingType = (typeof ALLOWED_PRICING_TYPES)[number];

export const SPECIALIST_SERVICE_CURRENCY = "EUR";

export const SERVICE_SELECT =
  "id, title, description, price_comment, pricing_type, price_from, price_to, currency, duration_minutes, is_active, category_id, created_at, updated_at";

export type SpecialistServiceDto = {
  id: string;
  title: string;
  description: string | null;
  price_comment: string | null;
  pricing_type: PricingType;
  price_from: number;
  price_to: number | null;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  category_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SpecialistCategorySummary = {
  id: string;
  slug: string | null;
  label: string | null;
};

export type SpecialistServicesReadiness = {
  onboarding_gate: SpecialistOnboardingGateState;
  publication_ready: boolean;
  public_profile_available: boolean;
};

export type SpecialistServicesReadResponse = {
  data: SpecialistServiceDto[];
  specialist_category: SpecialistCategorySummary | null;
  onboarding_gate: SpecialistOnboardingGateState;
  publication_ready: boolean;
  public_profile_available: boolean;
};

export type SpecialistServiceMutationResponse = {
  data: SpecialistServiceDto;
  onboarding_gate: SpecialistOnboardingGateState;
  publication_ready: boolean;
  public_profile_available: boolean;
};

export type SpecialistServiceDeleteResponse = {
  success: true;
  onboarding_gate: SpecialistOnboardingGateState;
  publication_ready: boolean;
  public_profile_available: boolean;
};
