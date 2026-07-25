export type PartnerStatus = "pending" | "active" | "paused" | "rejected" | "disabled";

export type AttributionMethod = "cookie" | "referral_code" | "admin";

export type CommissionSourceType =
  | "admin_confirmed_first_payment"
  | "stripe_invoice_payment_succeeded";

export type CommissionStatus = "pending" | "approved" | "rejected" | "paid" | "reversed";

export type PartnerRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  channel_name: string | null;
  channel_url: string | null;
  referral_code: string;
  status: PartnerStatus;
  commission_amount_cents: number;
  currency: string;
  contract_signed_at: string | null;
  /** Present after Phase 3 migration; may be null if column not applied yet. */
  agreement_version?: string | null;
  stripe_account_id?: string | null;
  stripe_onboarding_status?: string | null;
  stripe_payouts_enabled?: boolean | null;
  stripe_details_submitted?: boolean | null;
  stripe_last_synced_at?: string | null;
  approved_at: string | null;
  approved_by: string | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PartnerLinkRow = {
  id: string;
  partner_id: string;
  code: string;
  campaign: string | null;
  target_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PartnerAttributionRow = {
  id: string;
  partner_id: string;
  partner_link_id: string | null;
  user_id: string;
  specialist_id: string | null;
  attribution_method: AttributionMethod;
  first_click_at: string | null;
  registered_at: string;
  created_at: string;
};

export type PartnerCommissionRow = {
  id: string;
  partner_id: string;
  attribution_id: string;
  specialist_id: string;
  source_type: CommissionSourceType;
  source_event_id: string;
  amount_cents: number;
  currency: string;
  status: CommissionStatus;
  earned_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  payout_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ReferralCookiePayload = {
  v: 1;
  linkId: string;
  partnerId: string;
  issuedAt: number;
};

export type PartnerApplicationStatus = "pending" | "approved" | "rejected";

export type PartnerApplicationRow = {
  id: string;
  name: string;
  email: string;
  channel_name: string;
  channel_url: string;
  extra_links: unknown;
  platform: string | null;
  topic: string | null;
  audience_lang: string | null;
  audience_geo: string | null;
  subscribers_approx: string | null;
  reach_approx: string | null;
  comment: string | null;
  privacy_accepted_at: string;
  status: PartnerApplicationStatus;
  reject_reason: string | null;
  partner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PartnerInvitationRow = {
  id: string;
  partner_id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  created_by_label: string;
};

export type PartnerNotificationRow = {
  id: string;
  partner_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  commission_id: string | null;
  read_at: string | null;
  created_at: string;
};
