import { toSlug } from "@/lib/slugify";
import type { ClientCampaignUiLang } from "./constants";

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "become-specialist",
  "client",
  "dashboard",
  "de",
  "favicon",
  "for-specialists",
  "go",
  "impressum",
  "login",
  "manifest",
  "offline",
  "partner",
  "partners",
  "r",
  "request",
  "request-service",
  "robots",
  "ru",
  "services",
  "sitemap",
  "specialist",
  "specialists",
  "sw",
  "ua",
  "update-password",
]);

export function normalizeCampaignSlug(raw: string): string {
  return toSlug(raw).replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function isValidCampaignSlug(slug: string): boolean {
  if (!slug || slug.length < 2 || slug.length > 64) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/.test(slug);
}

export type CampaignSlugSeed = {
  name: string;
  ui_lang: ClientCampaignUiLang;
  category_slug?: string | null;
  place?: string | null;
  service_query?: string | null;
};

/** Build a readable base slug from campaign context (no uniqueness guarantee). */
export function buildCampaignSlugSeed(input: CampaignSlugSeed): string {
  const parts: string[] = [];
  if (input.category_slug?.trim()) {
    parts.push(normalizeCampaignSlug(input.category_slug));
  } else if (input.service_query?.trim()) {
    parts.push(normalizeCampaignSlug(input.service_query));
  } else if (input.name.trim()) {
    parts.push(normalizeCampaignSlug(input.name));
  }
  if (input.place?.trim()) {
    parts.push(normalizeCampaignSlug(input.place));
  }
  parts.push(input.ui_lang);
  const joined = parts.filter(Boolean).join("-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const base = joined || normalizeCampaignSlug(input.name) || "campaign";
  return base.slice(0, 64).replace(/-$/g, "");
}

/** Append deterministic numeric suffix when base slug collides. */
export function withSlugSuffix(base: string, suffix: number): string {
  const trimmed = base.replace(/-+$/, "").slice(0, 58);
  const candidate = `${trimmed}-${suffix}`;
  return candidate.slice(0, 64);
}
