export type PublicSpecialistPreview = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  category: string | null;
  languages: string[];
  workFormat: string | null;
  city: string | null;
  verification: "verified" | "published";
  profilePath: string;
};

const PRIVATE_KEYS = [
  "email",
  "phone",
  "client_email",
  "client_phone",
  "billing_visibility_blocked",
  "telegram_chat_id",
  "notification_locale",
];

export function toPublicSpecialistPreview(input: {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  category: string | null;
  languages: readonly string[];
  workFormat: string | null;
  city: string | null;
  status: string | null;
  locale: string;
}): PublicSpecialistPreview {
  const verified = input.status === "featured_verified" || input.status === "approved";
  const locale = /^[a-z]{2,3}$/.test(input.locale) ? input.locale : "ru";
  return {
    id: input.id,
    displayName: input.name?.trim() || "",
    avatarUrl: input.avatarUrl,
    category: input.category,
    languages: [...input.languages],
    workFormat: input.workFormat,
    city: input.workFormat === "online" ? null : input.city,
    verification: verified ? "verified" : "published",
    profilePath: `/${locale}/specialist/${input.id}`,
  };
}

export function previewHasPrivateFields(preview: PublicSpecialistPreview): boolean {
  const serialized = JSON.stringify(preview);
  return PRIVATE_KEYS.some((key) => serialized.includes(key));
}
