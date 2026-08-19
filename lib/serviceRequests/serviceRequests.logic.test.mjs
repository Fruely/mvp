import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./constants" && context.parentURL?.includes("validation.ts")) {
      return { url: new URL("./constants.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "./serviceTiming") {
      return { url: new URL("./serviceTiming.ts", import.meta.url).href, shortCircuit: true };
    }
    if (specifier === "./constants" && context.parentURL?.includes("serviceTiming.ts")) {
      return { url: new URL("./constants.ts", import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { generateServiceRequestPublicId } = await import("./publicId.ts");
const { validateServiceRequestCreate, isAllowedAdminStatus } = await import("./validation.ts");
const { formatNewServiceRequestOwnerMessage } = await import("./ownerTelegramMessage.ts");

const validBase = {
  client_name: "Anna Client",
  client_email: "anna@example.com",
  description: "Need help with tax filing in Berlin.",
  preferred_language: "ru",
  work_format: "online",
  service_timing_type: "asap",
  locale: "ru",
  hp: "",
};

test("B: specialist_id is rejected", () => {
  const result = validateServiceRequestCreate({ ...validBase, specialist_id: "evil-id" });
  assert.ok("error" in result);
  assert.match(result.error, /specialist_id/i);
});

test("C: missing name rejected", () => {
  const result = validateServiceRequestCreate({ ...validBase, client_name: "  " });
  assert.ok("error" in result);
  assert.equal(result.error, "client_name is required");
});

test("D: empty description rejected", () => {
  const result = validateServiceRequestCreate({ ...validBase, description: "" });
  assert.ok("error" in result);
  assert.equal(result.error, "description is required");
});

test("E: both phone and email missing rejected", () => {
  const result = validateServiceRequestCreate({
    ...validBase,
    client_email: null,
    client_phone: null,
  });
  assert.ok("error" in result);
  assert.equal(result.error, "client_email or client_phone is required");
});

test("F: invalid service_timing_type rejected", () => {
  const result = validateServiceRequestCreate({ ...validBase, service_timing_type: "tomorrow" });
  assert.ok("error" in result);
  assert.match(result.error, /service_timing_type/i);
});

test("G: exact_datetime requires date and time", () => {
  const missingTime = validateServiceRequestCreate({
    ...validBase,
    service_timing_type: "exact_datetime",
    service_timing_date: "2026-08-18",
  });
  assert.ok("error" in missingTime);
  assert.match(missingTime.error, /service_timing_time/i);
});

test("H: offline/hybrid requires city or postal_code", () => {
  const offline = validateServiceRequestCreate({
    ...validBase,
    work_format: "offline",
    city: null,
    postal_code: null,
  });
  assert.ok("error" in offline);

  const ok = validateServiceRequestCreate({
    ...validBase,
    work_format: "hybrid",
    postal_code: "10115",
  });
  assert.ok(!("error" in ok));
});

test("I: status from client rejected", () => {
  const result = validateServiceRequestCreate({ ...validBase, status: "matched" });
  assert.ok("error" in result);
  assert.match(result.error, /status/i);
});

test("J: spoofed source/public_id rejected", () => {
  assert.ok("error" in validateServiceRequestCreate({ ...validBase, source: "admin_import" }));
  assert.ok("error" in validateServiceRequestCreate({ ...validBase, public_id: "REQ-HACK" }));
});

test("public_id format is non-sequential and unique-ish", () => {
  const id = generateServiceRequestPublicId(new Date("2026-08-05T12:00:00.000Z"));
  assert.match(id, /^REQ-20260805-[A-Z0-9]{6}$/);
});

test("N: owner telegram message has no phone/email/name/description", () => {
  const message = formatNewServiceRequestOwnerMessage({
    public_id: "REQ-20260805-ABCDEF",
    category_text: "Tax",
    preferred_language: "ru",
    work_format: "online",
    city: "Berlin",
    postal_code: "10115",
    when_label: "Как можно скорее",
    urgency: "asap",
    created_at: "2026-08-05T10:00:00.000Z",
    locale: "ru",
  });
  assert.match(message, /REQ-20260805-ABCDEF/);
  assert.match(message, /admin\/service-requests/);
  assert.doesNotMatch(message, /secret@example\.com/);
  assert.doesNotMatch(message, /\+491701234567/);
  assert.doesNotMatch(message, /Описание:/i);
  assert.doesNotMatch(message, /client_name/i);
  assert.doesNotMatch(message, /Anna/i);
});

test("N2: telegram formatter source has no description field", () => {
  const src = readFileSync(new URL("./ownerTelegramMessage.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\bdescription\b/i);
  const message = formatNewServiceRequestOwnerMessage({
    public_id: "REQ-20260805-ZZZZZZ",
    category_text: "Bookkeeping",
    preferred_language: "de",
    work_format: "hybrid",
    city: null,
    postal_code: "80331",
    when_label: "Nächste Woche",
    urgency: "within_week",
    created_at: "2026-08-05T11:00:00.000Z",
    locale: "de",
  });
  assert.doesNotMatch(message, /TOP_SECRET_PHRASE_DO_NOT_LEAK/);
  assert.match(message, /80331/);
  assert.match(message, /admin\/service-requests/);
});

test("notify NEW_SERVICE_REQUEST does not reference description or sanitizer", () => {
  const src = readFileSync(new URL("../notifications/notify.ts", import.meta.url), "utf8");
  assert.match(src, /NEW_SERVICE_REQUEST/);
  assert.match(src, /formatNewServiceRequestOwnerMessage/);
  assert.doesNotMatch(src, /sanitizeServiceRequestSummary/);
  assert.doesNotMatch(src, /description/);
  assert.doesNotMatch(src, /client_phone/);
  assert.doesNotMatch(src, /client_email/);
});

test("admin list select excludes client contacts", () => {
  const src = readFileSync(new URL("./validation.ts", import.meta.url), "utf8");
  assert.match(src, /SERVICE_REQUEST_LIST_SELECT/);
  assert.doesNotMatch(src.match(/SERVICE_REQUEST_LIST_SELECT[\s\S]*?;/)?.[0] ?? "", /client_email/);
});

test("S: allowed admin statuses only", () => {
  assert.equal(isAllowedAdminStatus("reviewing"), true);
  assert.equal(isAllowedAdminStatus("hacked"), false);
});

test("V: RU/UA/DE locale keys exist", () => {
  for (const file of ["ru.json", "ua.json", "de.json"]) {
    const json = JSON.parse(
      readFileSync(new URL(`../../locales/${file}`, import.meta.url), "utf8"),
    );
    assert.ok(json.serviceRequest?.title);
    assert.ok(json.serviceRequest?.cta?.button);
    assert.ok(json.serviceRequest?.urgency?.asap);
    assert.ok(json.serviceRequest?.privacyNotice?.before);
    assert.ok(json.serviceRequest?.privacyNotice?.link);
    assert.ok(json.serviceRequest?.privacyNotice?.after);
  }
});

test("privacy notice uses locale-aware privacy route", () => {
  const pathsSrc = readFileSync(new URL("../legal/paths.ts", import.meta.url), "utf8");
  assert.match(pathsSrc, /datenschutzerklaerung/);
  const formSrc = readFileSync(
    new URL("../../components/serviceRequests/ServiceRequestForm.tsx", import.meta.url),
    "utf8",
  );
  assert.match(formSrc, /privacyPath\(lang\)/);
  assert.match(formSrc, /serviceRequest\.privacyNotice/);
  assert.doesNotMatch(formSrc, /privacyConsent/i);
  assert.doesNotMatch(formSrc, /type=\"checkbox\"/);
  assert.doesNotMatch(formSrc, /<h1/);
});

test("request-service page keeps a single canonical heading", () => {
  const pageSrc = readFileSync(
    new URL("../../app/[lang]/request-service/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(pageSrc, /DashboardPageHeader/);
  assert.match(pageSrc, /serviceRequest\.title/);
});

test("direct leads create route unchanged specialist requirement", () => {
  const src = readFileSync(
    new URL("../../app/api/leads/create/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /specialist_id is required/);
  assert.doesNotMatch(src, /service_requests/);
});

test("CTA blocks added to search surfaces", () => {
  const specialists = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf8",
  );
  const category = readFileSync(
    new URL("../../app/[lang]/specialists/[categorySlug]/CategoryHubClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(specialists, /ServiceRequestCtaBlock/);
  assert.match(category, /ServiceRequestCtaBlock/);
});

function readClientFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) readClientFiles(full, acc);
    else if (/\.(tsx|ts|jsx|js)$/.test(name.name)) acc.push(full);
  }
  return acc;
}

test("D: service-requests admin client files do not reference admin secret", () => {
  const adminDir = fileURLToPath(
    new URL("../../app/admin/(protected)/service-requests/", import.meta.url),
  );
  const files = readClientFiles(adminDir);
  const forbidden = [
    /ADMIN_API_TOKEN/,
    /x-admin-token/i,
    /localStorage/,
    /sessionStorage/,
    /NEXT_PUBLIC.*ADMIN/i,
    /process\.env\.ADMIN/,
  ];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const isClient = src.includes('"use client"');
    if (!isClient) continue;
    for (const pattern of forbidden) {
      assert.doesNotMatch(src, pattern, `${file} must not contain ${pattern}`);
    }
  }
  assert.ok(files.some((f) => f.endsWith("ServiceRequestsAdminView.tsx")));
});

test("E: admin secret is not passed through service-requests props", () => {
  const pageSrc = readFileSync(
    new URL("../../app/admin/(protected)/service-requests/page.tsx", import.meta.url),
    "utf8",
  );
  const viewSrc = readFileSync(
    new URL("../../app/admin/(protected)/service-requests/ServiceRequestsAdminView.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(pageSrc, /ADMIN_API_TOKEN|adminToken|x-admin-token/i);
  assert.doesNotMatch(viewSrc, /ADMIN_API_TOKEN|adminToken|x-admin-token|localStorage|sessionStorage/i);
  assert.match(pageSrc, /listServiceRequestsAdmin/);
  assert.match(viewSrc, /updateServiceRequestStatusAction/);
});

test("G: detail access uses server-authoritative adminData", () => {
  const adminDataSrc = readFileSync(new URL("./adminData.ts", import.meta.url), "utf8");
  assert.match(adminDataSrc, /assertAdminSession/);
  assert.match(adminDataSrc, /SERVICE_REQUEST_ADMIN_DETAIL_SELECT/);
  const actionsSrc = readFileSync(
    new URL("../../app/admin/(protected)/service-requests/actions.ts", import.meta.url),
    "utf8",
  );
  assert.match(actionsSrc, /"use server"/);
  assert.match(actionsSrc, /updateServiceRequestStatusAdmin/);
});
