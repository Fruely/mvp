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

export type ProPageContentFields = {
  display_name: string | null;
  profession_label: string | null;
  positioning: string | null;
  client_requests: ProPageSectionItem[];
  work_process: ProPageSectionItem[];
  why_me: ProPageSectionItem[];
  story: string | null;
  client_language: string | null;
  why_me_image_url: string | null;
  final_cta_image_url: string | null;
};

export type SpecialistProPageRow = ProPageContentFields & {
  specialist_id: string;
  status: ProPageStatus;
  published_at: string | null;
  updated_at: string;
};

export type SpecialistProPageDraftRow = ProPageContentFields & {
  specialist_id: string;
  created_at: string;
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
  whyMeImageUrl: string | null;
  finalCtaImageUrl: string | null;
};

export type PublicProPageBundle = {
  renderAsProPage: boolean;
  entitlementSource: ProEntitlementSource | null;
  content: PublicProPageContent | null;
};

export type ProPageEditorDraftPayload = {
  displayName: string | null;
  professionLabel: string | null;
  positioning: string | null;
  story: string | null;
  clientLanguage: string | null;
  clientRequests: ProPageSectionItem[];
  workProcess: ProPageSectionItem[];
  whyMe: ProPageSectionItem[];
  whyMeImageUrl: string | null;
  finalCtaImageUrl: string | null;
  updatedAt: string;
};

export type ProPageEditorBundle = {
  draft: ProPageEditorDraftPayload;
  hasPublishedPage: boolean;
  publicPath: string | null;
  publicSlug: string;
  entitlementActive: boolean;
};
