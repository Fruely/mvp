const MAX_EXTRA_LINKS = 5;
const MAX_TEXT = 2000;

export function isValidHttpUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value || value.length > 2000) return false;
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname || u.hostname.includes(" ")) return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizeExtraLinks(raw: unknown): string[] {
  if (raw == null) return [];
  let list: unknown[] = [];
  if (typeof raw === "string") {
    list = raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(raw)) {
    list = raw;
  } else {
    return [];
  }
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t) continue;
    if (!isValidHttpUrl(t)) continue;
    out.push(t);
    if (out.length >= MAX_EXTRA_LINKS) break;
  }
  return out;
}

export type ApplicationInput = {
  name: string;
  email: string;
  channel_name: string;
  channel_url: string;
  extra_links?: unknown;
  platform?: string | null;
  topic?: string | null;
  audience_lang?: string | null;
  audience_geo?: string | null;
  subscribers_approx?: string | null;
  reach_approx?: string | null;
  comment?: string | null;
  privacy_accepted: boolean;
};

export type ValidatedApplication = {
  name: string;
  email: string;
  channel_name: string;
  channel_url: string;
  extra_links: string[];
  platform: string | null;
  topic: string | null;
  audience_lang: string | null;
  audience_geo: string | null;
  subscribers_approx: string | null;
  reach_approx: string | null;
  comment: string | null;
  privacy_accepted_at: string;
};

export function validateApplicationInput(
  input: ApplicationInput
): { ok: true; value: ValidatedApplication } | { ok: false; error: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const channelName = typeof input.channel_name === "string" ? input.channel_name.trim() : "";
  const channelUrl = typeof input.channel_url === "string" ? input.channel_url.trim() : "";

  if (!name || name.length > 200) return { ok: false, error: "invalid_name" };
  if (!email.includes("@") || email.length > 320) return { ok: false, error: "invalid_email" };
  if (!channelName || channelName.length > 200) return { ok: false, error: "invalid_channel_name" };
  if (!isValidHttpUrl(channelUrl)) return { ok: false, error: "invalid_channel_url" };
  if (input.privacy_accepted !== true) return { ok: false, error: "privacy_required" };

  const clip = (v: unknown, max = 500) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t) return null;
    return t.slice(0, max);
  };

  return {
    ok: true,
    value: {
      name,
      email,
      channel_name: channelName,
      channel_url: channelUrl,
      extra_links: normalizeExtraLinks(input.extra_links),
      platform: clip(input.platform, 120),
      topic: clip(input.topic, 200),
      audience_lang: clip(input.audience_lang, 80),
      audience_geo: clip(input.audience_geo, 120),
      subscribers_approx: clip(input.subscribers_approx, 80),
      reach_approx: clip(input.reach_approx, 80),
      comment: clip(input.comment, MAX_TEXT),
      privacy_accepted_at: new Date().toISOString(),
    },
  };
}
