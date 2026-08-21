export type ProEntitlementSource = "paid" | "gifted" | "admin_granted";

export type ProPageStatus = "draft" | "published";

export type ProPageSectionItem = {
  title: string;
  description: string;
};

export type SpecialistProEntitlementRow = {
  specialist_id: string;
  source: ProEntitlementSource;
  is_active: boolean;
  granted_at: string;
  metadata: Record<string, unknown> | null;
};

export type SpecialistProPageRow = {
  specialist_id: string;
  status: ProPageStatus;
  display_name: string | null;
  profession_label: string | null;
  positioning: string | null;
  client_requests: ProPageSectionItem[];
  work_process: ProPageSectionItem[];
  why_me: ProPageSectionItem[];
  story: string | null;
  client_language: string | null;
  published_at: string | null;
  updated_at: string;
};

export type PublicProPageContent = {
  displayName: string | null;
  professionLabel: string | null;
  positioning: string | null;
  clientRequests: ProPageSectionItem[];
  workProcess: ProPageSectionItem[];
  whyMe: ProPageSectionItem[];
  story: string | null;
  clientLanguage: string | null;
};

export type PublicProPageBundle = {
  renderAsProPage: boolean;
  entitlementSource: ProEntitlementSource | null;
  content: PublicProPageContent | null;
};
