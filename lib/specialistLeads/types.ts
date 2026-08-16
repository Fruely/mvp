export const SPECIALIST_LEAD_STATUSES = ["new", "accepted", "contacted", "closed"] as const;

export type SpecialistLeadStatus = (typeof SPECIALIST_LEAD_STATUSES)[number];

export type SpecialistLeadApiItem = {
  id: string;
  created_at: string | null;
  status: string | null;
  public_id: string;
  contacts_unlocked: boolean;
  contact_available: boolean;
  message_preview: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  source: string | null;
  source_path: string | null;
  contact_unlocked_at: string | null;
};

export type SpecialistLeadListPage = {
  items: SpecialistLeadApiItem[];
  next_cursor: string | null;
};
