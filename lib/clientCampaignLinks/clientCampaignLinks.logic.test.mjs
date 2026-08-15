import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/i18n") {
      return { url: new URL("../i18n.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "@/lib/slugify") {
      return { url: new URL("../slugify.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "@/lib/serviceRequests/requestServiceHref") {
      return {
        url: new URL("../serviceRequests/requestServiceHref.ts", import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".mjs") &&
      context.parentURL?.includes("/lib/clientCampaignLinks/")
    ) {
      return {
        url: new URL(`${specifier}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (specifier === "./constants" && context.parentURL?.includes("serviceTiming.ts")) {
      return { url: new URL("../serviceRequests/constants.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "./constants" && context.parentURL?.includes("clientCampaignLinks/validation")) {
      return { url: new URL("./constants.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "./constants" && context.parentURL?.includes("serviceRequests/validation")) {
      return { url: new URL("../serviceRequests/constants.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "./serviceTiming") {
      return { url: new URL("../serviceRequests/serviceTiming.ts", import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const {
  buildCampaignSlugSeed,
  isValidCampaignSlug,
  normalizeCampaignSlug,
  withSlugSuffix,
} = await import("./slug.ts");
const {
  validateCampaignLinkCreate,
  validateCampaignLinkUpdate,
} = await import("./validation.ts");
const { campaignLinkToRequestHref, summarizeCampaignContext } = await import("./resolve.ts");
const { campaignPublicPath, campaignPublicUrl } = await import("./publicUrl.ts");
const { campaignPreferredLanguageToFormLang } = await import("./constants.ts");
const { requestServiceHref } = await import("../serviceRequests/requestServiceHref.ts");
const { validateServiceRequestCreate } = await import("../serviceRequests/validation.ts");

const validCampaignBase = {
  name: "Электрик München RU — Facebook",
  ui_lang: "ru",
  category_id: "11111111-1111-4111-8111-111111111111",
  category_slug: "electrician",
  place: "München",
  preferred_language: "ru",
  work_format: "offline",
  source: "facebook",
};

test("slug generation produces lowercase URL-safe seed", () => {
  const slug = buildCampaignSlugSeed({
    name: validCampaignBase.name,
    ui_lang: "ru",
    category_slug: "electrician",
    place: "München",
  });
  assert.match(slug, /^electrician-muenchen-ru$/);
  assert.ok(isValidCampaignSlug(slug));
});

test("duplicate slug handling uses deterministic suffix", () => {
  const base = "electrician-munich-ru";
  assert.equal(withSlugSuffix(base, 2), "electrician-munich-ru-2");
  assert.ok(isValidCampaignSlug(withSlugSuffix(base, 2)));
});

test("valid campaign passes validation", () => {
  const result = validateCampaignLinkCreate(validCampaignBase);
  assert.ok(!("error" in result));
  assert.equal(result.name, validCampaignBase.name);
  assert.equal(result.ui_lang, "ru");
});

test("zero-supply category allowed (category_id only)", () => {
  const result = validateCampaignLinkCreate({
    name: "Zero supply electrician",
    ui_lang: "de",
    category_id: "22222222-2222-4222-8222-222222222222",
    category_slug: "electrician",
  });
  assert.ok(!("error" in result));
});

test("service query allowed without category", () => {
  const result = validateCampaignLinkCreate({
    name: "Custom query campaign",
    ui_lang: "ua",
    service_query: "electrician",
  });
  assert.ok(!("error" in result));
  assert.equal(result.service_query, "electrician");
});

test("invalid ui_lang rejected", () => {
  const result = validateCampaignLinkCreate({ ...validCampaignBase, ui_lang: "en" });
  assert.ok("error" in result);
  assert.equal(result.error, "invalid_ui_lang");
});

test("invalid work_format rejected", () => {
  const result = validateCampaignLinkCreate({ ...validCampaignBase, work_format: "remote" });
  assert.ok("error" in result);
  assert.equal(result.error, "invalid_work_format");
});

test("invalid preferred_language rejected", () => {
  const result = validateCampaignLinkCreate({ ...validCampaignBase, preferred_language: "fr" });
  assert.ok("error" in result);
  assert.equal(result.error, "invalid_preferred_language");
});

test("campaign without target rejected", () => {
  const result = validateCampaignLinkCreate({
    name: "Missing target",
    ui_lang: "ru",
  });
  assert.ok("error" in result);
});

test("active campaign resolves to correct locale and context href", () => {
  const href = campaignLinkToRequestHref(
    {
      id: "33333333-3333-4333-8333-333333333333",
      slug: "elektrik-muenchen-ru",
      name: validCampaignBase.name,
      ui_lang: "ru",
      category_id: validCampaignBase.category_id,
      category_slug: "electrician",
      service_query: null,
      place: "München",
      preferred_language: "ru",
      work_format: "offline",
      radius_km: null,
      source: "facebook",
      campaign_code: null,
      is_active: true,
      created_at: "2026-08-15T00:00:00.000Z",
      updated_at: "2026-08-15T00:00:00.000Z",
    },
    { category_text: "Электрик" },
  );

  assert.match(href, /^\/ru\/request-service\?/);
  assert.match(href, /category_id=11111111-1111-4111-8111-111111111111/);
  assert.match(href, /place=M%C3%BCnchen/);
  assert.match(href, /preferred_language=ru/);
  assert.match(href, /work_format=offline/);
  assert.match(href, /source_path=%2Fgo%2Felektrik-muenchen-ru/);
  assert.doesNotMatch(href, /client_campaign_link_id/);
});

test("ua preferred language maps to ua form lang", () => {
  assert.equal(campaignPreferredLanguageToFormLang("uk"), "ua");
  assert.equal(campaignPreferredLanguageToFormLang("ua"), "ua");
});

test("public URL format is stable /go/{slug}", () => {
  assert.equal(campaignPublicPath("elektrik-muenchen-ru"), "/go/elektrik-muenchen-ru");
  assert.equal(
    campaignPublicUrl("elektrik-muenchen-ru", "https://freuly.de"),
    "https://freuly.de/go/elektrik-muenchen-ru",
  );
});

test("generated URLs contain no PII patterns", () => {
  const href = requestServiceHref("ru", {
    category_text: "Electrician",
    place: "München",
    source_path: "/go/elektrik-muenchen-ru",
  });
  assert.doesNotMatch(href, /@/);
  assert.doesNotMatch(href, /\+49/);
  assert.doesNotMatch(href, /client_name|email|phone|client_campaign_link_id/i);
});

test("service request rejects client-supplied campaign attribution id", () => {
  const result = validateServiceRequestCreate({
    client_name: "Anna",
    client_email: "anna@example.com",
    description: "Need electrician",
    preferred_language: "ru",
    work_format: "offline",
    city: "München",
    service_timing_type: "asap",
    locale: "ru",
    source_path: "/go/elektrik-muenchen-ru",
    client_campaign_link_id: "33333333-3333-4333-8333-333333333333",
    hp: "",
  });
  assert.ok("error" in result);
  assert.match(result.error, /client_campaign_link_id/i);
});

test("non-campaign service requests still work without attribution", () => {
  const result = validateServiceRequestCreate({
    client_name: "Anna",
    client_email: "anna@example.com",
    description: "Need help",
    preferred_language: "ru",
    work_format: "online",
    service_timing_type: "asap",
    locale: "ru",
    source_path: "/specialists?lang=ru",
    hp: "",
  });
  assert.ok(!("error" in result));
  assert.equal(result.source_path, "/specialists?lang=ru");
});

test("source_path compatibility preserved on validated requests", () => {
  const result = validateServiceRequestCreate({
    client_name: "Anna",
    client_email: "anna@example.com",
    description: "Need help",
    preferred_language: "ru",
    work_format: "online",
    service_timing_type: "asap",
    locale: "ru",
    source_path: "/go/elektrik-muenchen-ru",
    hp: "",
  });
  assert.ok(!("error" in result));
  assert.equal(result.source_path, "/go/elektrik-muenchen-ru");
});

test("request timing remains required", () => {
  const result = validateServiceRequestCreate({
    client_name: "Anna",
    client_email: "anna@example.com",
    description: "Need help",
    preferred_language: "ru",
    work_format: "online",
    service_timing_type: "tomorrow",
    locale: "ru",
    hp: "",
  });
  assert.ok("error" in result);
});

test("go route returns 404 for unknown/inactive via notFound", () => {
  const src = readFileSync(new URL("../../app/go/[slug]/route.ts", import.meta.url), "utf8");
  assert.match(src, /notFound\(\)/);
  assert.match(src, /findActiveCampaignBySlug/);
  assert.match(src, /if \(!campaign\)/);
});

test("admin routes require canonical auth", () => {
  const listRoute = readFileSync(
    new URL("../../app/api/admin/campaign-links/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(listRoute, /requireAdminToken/);
});

test("public cannot modify campaigns — RLS deny in migration", () => {
  const sql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-08-15_client_campaign_links.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON TABLE public.client_campaign_links FROM anon, authenticated/);
});

test("promoted-request accept flow untouched", () => {
  const serviceRequestsRoute = readFileSync(
    new URL("../../app/api/service-requests/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(serviceRequestsRoute, /service_request_promotions/);
  assert.doesNotMatch(serviceRequestsRoute, /stripe/i);
});

test("slug normalization lowercases input", () => {
  assert.equal(normalizeCampaignSlug("GO"), "go");
});

test("campaign update rejects empty name", () => {
  const result = validateCampaignLinkUpdate({ name: "   " });
  assert.ok("error" in result);
});

test("context summary includes key fields", () => {
  const summary = summarizeCampaignContext({
    name: "Test",
    category_slug: "electrician",
    place: "München",
    preferred_language: "ru",
    work_format: "offline",
    source: "facebook",
  });
  assert.match(summary, /electrician/);
  assert.match(summary, /München/);
  assert.match(summary, /facebook/);
});
