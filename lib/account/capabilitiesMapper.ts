import { isPublicLeadTargetSpecialist } from "../specialists/status";
import type { SpecialistOnboardingGateState } from "../specialists/server";
import {
  resolveContactUnlockEntitlement,
  type BillingAccessState,
} from "../billing/contactUnlockEntitlement";

export type AccountCapabilitiesDto = {
  capabilities: {
    specialist: boolean;
    partner: boolean;
  };
  specialist: AccountSpecialistOverviewDto | null;
  partner: AccountPartnerOverviewDto | null;
};

export type AccountSpecialistOverviewDto = {
  id: string;
  slug: string | null;
  name: string | null;
  status: string;
  public_profile_available: boolean;
  category_label: string | null;
  work_format: string | null;
  city: string | null;
  onboarding_gate: SpecialistOnboardingGateState;
  publication_ready: boolean;
  founder_badge: boolean;
  plan_code: string;
  plan_status: string;
  billing_access_state: BillingAccessState;
  grace_until: string | null;
  can_unlock_contacts: boolean;
};

export type AccountPartnerOverviewDto = {
  id: string;
  status: string;
};

export function mapSpecialistOverview(input: {
  row: {
    id: string;
    slug?: string | null;
    name?: string | null;
    status?: string | null;
    is_active?: boolean | null;
    is_visible?: boolean | null;
    billing_visibility_blocked?: boolean | null;
    is_test?: boolean | null;
    work_format?: string | null;
    founder_badge?: boolean | null;
  };
  city: string | null;
  categoryLabel: string | null;
  gate: {
    state: SpecialistOnboardingGateState;
    publicationReady: boolean;
  };
  planCode: string;
  planStatus?: string | null;
  graceUntil?: string | null;
}): AccountSpecialistOverviewDto {
  const slug = typeof input.row.slug === "string" && input.row.slug.trim() ? input.row.slug.trim() : null;
  const status = typeof input.row.status === "string" && input.row.status.trim() ? input.row.status.trim() : "draft";
  const publicProfileAvailable =
    Boolean(slug) &&
    isPublicLeadTargetSpecialist({
      status: input.row.status,
      is_active: input.row.is_active,
      is_visible: input.row.is_visible,
      billing_visibility_blocked: input.row.billing_visibility_blocked,
      is_test: input.row.is_test,
    });
  const entitlement = resolveContactUnlockEntitlement(input.planStatus);

  return {
    id: input.row.id,
    slug,
    name: typeof input.row.name === "string" && input.row.name.trim() ? input.row.name.trim() : null,
    status,
    public_profile_available: publicProfileAvailable,
    category_label: input.categoryLabel,
    work_format:
      input.row.work_format === "online" ||
      input.row.work_format === "offline" ||
      input.row.work_format === "hybrid"
        ? input.row.work_format
        : null,
    city: input.city,
    onboarding_gate: input.gate.state,
    publication_ready: input.gate.publicationReady,
    founder_badge: input.row.founder_badge === true,
    plan_code: input.planCode,
    plan_status: typeof input.planStatus === "string" ? input.planStatus : "",
    billing_access_state: entitlement.billing_access_state,
    grace_until: input.graceUntil ?? null,
    can_unlock_contacts: entitlement.can_unlock_contacts,
  };
}

export function buildAccountCapabilitiesDto(input: {
  specialist: AccountSpecialistOverviewDto | null;
  partner: AccountPartnerOverviewDto | null;
}): AccountCapabilitiesDto {
  return {
    capabilities: {
      specialist: input.specialist !== null,
      partner: input.partner !== null,
    },
    specialist: input.specialist,
    partner: input.partner,
  };
}

/** Strip private/internal fields before serialization — contract guard for tests. */
export function assertClientSafeCapabilitiesDto(dto: AccountCapabilitiesDto): AccountCapabilitiesDto {
  if (dto.specialist) {
    const allowed = new Set([
      "id",
      "slug",
      "name",
      "status",
      "public_profile_available",
      "category_label",
      "work_format",
      "city",
      "onboarding_gate",
      "publication_ready",
      "founder_badge",
      "plan_code",
      "plan_status",
      "billing_access_state",
      "grace_until",
      "can_unlock_contacts",
    ]);
    for (const key of Object.keys(dto.specialist)) {
      if (!allowed.has(key)) {
        throw new Error(`unsafe specialist field: ${key}`);
      }
    }
  }

  if (dto.partner) {
    const allowed = new Set(["id", "status"]);
    for (const key of Object.keys(dto.partner)) {
      if (!allowed.has(key)) {
        throw new Error(`unsafe partner field: ${key}`);
      }
    }
  }

  return dto;
}
