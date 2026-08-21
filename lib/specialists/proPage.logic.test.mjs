import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";
import {
  hasActiveProEntitlement,
  isPublishedProPage,
  proEntitlementIndependentOfBilling,
  resolveProPageDisplayName,
  shouldRenderProPage,
} from "./proPage/entitlement.ts";
import {
  buildProPageSharePayload,
  canUseNativeShare,
  resolveProPageShareAction,
} from "./proPage/share.ts";
import { buildProPageDescription } from "./proPage/resolvePublicProPage.ts";

registerPartnerTestHooks();

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("normal specialist without Pro entitlement renders standard profile branch", () => {
  assert.equal(shouldRenderProPage(null, null), false);
  assert.equal(shouldRenderProPage({ is_active: false }, { status: "published" }), false);
});

test("gifted active entitlement + published Pro Page renders Pro Page", () => {
  assert.equal(
    shouldRenderProPage({ is_active: true }, { status: "published" }),
    true,
  );
});

test("gifted entitlement + draft Pro Page keeps standard profile", () => {
  assert.equal(
    shouldRenderProPage({ is_active: true, source: "gifted" }, { status: "draft" }),
    false,
  );
});

test("inactive entitlement + published content keeps standard profile", () => {
  assert.equal(
    shouldRenderProPage({ is_active: false, source: "gifted" }, { status: "published" }),
    false,
  );
});

test("basic billing state does not remove gifted Pro entitlement", () => {
  assert.equal(
    proEntitlementIndependentOfBilling({ is_active: true, source: "gifted" }),
    true,
  );
  assert.equal(
    proEntitlementIndependentOfBilling({ is_active: true, source: "admin_granted" }),
    true,
  );
  assert.equal(hasActiveProEntitlement({ is_active: true }), true);
  assert.equal(isPublishedProPage({ status: "published" }), true);
});

test("Pro Page share fallback prefers native share when available", () => {
  assert.equal(resolveProPageShareAction({ share: () => {} }), "native");
  assert.equal(resolveProPageShareAction({}), "copy");
  assert.equal(canUseNativeShare({ share: async () => {} }), true);
  assert.deepEqual(
    buildProPageSharePayload({
      url: " https://freuly.de/ru/specialist/example ",
      title: " Irina ",
      text: " NLP consulting ",
    }),
    {
      url: "https://freuly.de/ru/specialist/example",
      title: "Irina",
      text: "NLP consulting",
    },
  );
});

test("existing canonical routing remains unchanged in specialist page entry", () => {
  const pageSource = readFileSync(
    join(root, "app/[lang]/specialist/[id]/page.tsx"),
    "utf8",
  );
  assert.match(pageSource, /specialistCanonicalRedirectPath/);
  assert.match(pageSource, /permanentRedirect/);
  assert.match(pageSource, /SpecialistProfileClient/);
  assert.match(pageSource, /SpecialistProPageClient/);
  assert.match(pageSource, /loadPublicProPageBundle/);
  assert.doesNotMatch(pageSource, /app\/\[lang\]\/pro\//);
});

test("Pro display_name override falls back to canonical specialist.name", () => {
  assert.equal(resolveProPageDisplayName("Irina Vialdina", "Ирина Вялдина"), "Ирина Вялдина");
  assert.equal(resolveProPageDisplayName("Irina Vialdina", null), "Irina Vialdina");
  assert.equal(resolveProPageDisplayName("Irina Vialdina", "   "), "Irina Vialdina");
  assert.equal(resolveProPageDisplayName(null, "Ирина Вялдина"), "Ирина Вялдина");
});

test("Pro metadata uses positioning without keyword stuffing", () => {
  const description = buildProPageDescription({
    name: "Ирина Вялдина",
    professionLabel: "NLP-консультант",
    categoryTitle: "Психологи",
    city: null,
    positioning:
      "Помогаю разобраться с конкретной ситуацией, которая сейчас мешает жить спокойнее и свободнее.",
    lang: "ru",
  });
  assert.match(description, /Ирина Вялдина — NLP-консультант\./);
  assert.match(description, /Помогаю разобраться/);
});

test("schema migration is separate from Irina gift seed data", () => {
  const schema = readFileSync(
    join(root, "supabase/manual_migrations/2026-08-21_specialist_pro_pages.sql"),
    "utf8",
  );
  const gift = readFileSync(
    join(root, "supabase/manual_migrations/2026-08-21_irina_vialdina_pro_gift.sql"),
    "utf8",
  );
  assert.doesNotMatch(schema, /psychologists-irina-vialdina/);
  assert.match(gift, /psychologists-irina-vialdina/);
  assert.match(gift, /'Ирина Вялдина'/);
  assert.match(schema, /display_name text NULL/);
});

test("standard profile component was not rewritten for Pro sections", () => {
  const profileSource = readFileSync(
    join(root, "components/specialist/SpecialistProfileClient.tsx"),
    "utf8",
  );
  assert.doesNotMatch(profileSource, /SpecialistProPageClient/);
  assert.doesNotMatch(profileSource, /С чем можно обратиться/);
});
