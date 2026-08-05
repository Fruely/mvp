import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { harness, resetHarness } from "./serviceRequests.harness.mjs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "@/lib/supabase/server": new URL("./testMocks/service-server.mjs", import.meta.url).href,
      "@/lib/adminSession": new URL("./testMocks/adminSession.mjs", import.meta.url).href,
      "@/lib/partners/referralUrl": new URL("../partners/referralUrl.ts", import.meta.url).href,
      "server-only": new URL("./testMocks/server-only.mjs", import.meta.url).href,
    };
    if (map[specifier]) return { url: map[specifier], shortCircuit: true };
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".mjs")
    ) {
      return {
        url: new URL(`${specifier}.ts`, context.parentURL).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const {
  savePromotionDraftAdmin,
  publishPromotionAdmin,
  closePromotionAdmin,
  getPromotionByServiceRequestIdAdmin,
} = await import("./promotionAdminData.ts");
const { getPublishedPromotionByToken } = await import("./promotionPublicData.ts");

const SERVICE_REQUEST_ID = "11111111-2222-3333-4444-555555555555";

const draftInput = {
  locale: "ru",
  public_title: "Обезличенный заголовок",
  public_summary: "Обезличенное описание задачи без контактов клиента.",
};

test.beforeEach(() => resetHarness());

function seedServiceRequest() {
  harness.rows.push({ id: SERVICE_REQUEST_ID, public_id: "REQ-20260805-ABCDEF" });
}

test("D/E: draft create works and one promotion per service_request", async () => {
  seedServiceRequest();
  const created = await savePromotionDraftAdmin(SERVICE_REQUEST_ID, draftInput);
  assert.equal(created.status, "draft");
  assert.ok(created.public_token);
  assert.equal(harness.promotionRows.length, 1);

  const updated = await savePromotionDraftAdmin(SERVICE_REQUEST_ID, {
    ...draftInput,
    public_title: "Второй save не создаёт новую запись",
  });
  assert.equal(harness.promotionRows.length, 1);
  assert.equal(updated.public_token, created.public_token);
});

test("F: editing draft preserves token", async () => {
  seedServiceRequest();
  const created = await savePromotionDraftAdmin(SERVICE_REQUEST_ID, draftInput);
  const updated = await savePromotionDraftAdmin(SERVICE_REQUEST_ID, {
    ...draftInput,
    public_title: "Обновлённый заголовок",
  });
  assert.equal(updated.public_token, created.public_token);
  assert.equal(updated.public_title, "Обновлённый заголовок");
});

test("G/H: publish sets published_at and repeat publish is idempotent", async () => {
  seedServiceRequest();
  await savePromotionDraftAdmin(SERVICE_REQUEST_ID, draftInput);
  const published = await publishPromotionAdmin(SERVICE_REQUEST_ID);
  assert.equal(published.status, "published");
  assert.ok(published.published_at);
  assert.equal(published.closed_at, null);
  assert.ok(published.public_url?.includes("/ru/request/"));

  const again = await publishPromotionAdmin(SERVICE_REQUEST_ID);
  assert.equal(again.status, "published");
  assert.equal(again.public_token, published.public_token);
  assert.equal(again.published_at, published.published_at);
});

test("I/J: close sets closed_at and repeat close is idempotent", async () => {
  seedServiceRequest();
  await savePromotionDraftAdmin(SERVICE_REQUEST_ID, draftInput);
  await publishPromotionAdmin(SERVICE_REQUEST_ID);
  const closed = await closePromotionAdmin(SERVICE_REQUEST_ID);
  assert.equal(closed.status, "closed");
  assert.ok(closed.closed_at);

  const again = await closePromotionAdmin(SERVICE_REQUEST_ID);
  assert.equal(again.status, "closed");
  assert.equal(again.closed_at, closed.closed_at);
  assert.equal(again.public_token, closed.public_token);
});

test("S: admin promotion operations require session", async () => {
  seedServiceRequest();
  harness.adminSessionValid = false;
  await assert.rejects(
    () => savePromotionDraftAdmin(SERVICE_REQUEST_ID, draftInput),
    (err) => err instanceof Error && err.message === "UNAUTHORIZED",
  );
});

test("K/L/M/N: public read by token visibility", async () => {
  seedServiceRequest();
  const draft = await savePromotionDraftAdmin(SERVICE_REQUEST_ID, draftInput);
  assert.equal(await getPublishedPromotionByToken("unknown-token"), null);
  assert.equal(await getPublishedPromotionByToken(draft.public_token), null);

  const published = await publishPromotionAdmin(SERVICE_REQUEST_ID);
  const visible = await getPublishedPromotionByToken(published.public_token);
  assert.ok(visible);
  assert.equal(visible.public_title, draftInput.public_title);
  assert.equal(visible.status, "published");

  await closePromotionAdmin(SERVICE_REQUEST_ID);
  assert.equal(await getPublishedPromotionByToken(published.public_token), null);
});

test("O-Q: public payload has no contacts or raw description keys", async () => {
  seedServiceRequest();
  await savePromotionDraftAdmin(SERVICE_REQUEST_ID, draftInput);
  const published = await publishPromotionAdmin(SERVICE_REQUEST_ID);
  const visible = await getPublishedPromotionByToken(published.public_token);
  const serialized = JSON.stringify(visible);
  assert.doesNotMatch(serialized, /client_name/);
  assert.doesNotMatch(serialized, /client_email/);
  assert.doesNotMatch(serialized, /client_phone/);
  assert.doesNotMatch(serialized, /description/);
  assert.doesNotMatch(serialized, /service_request_id/);
});

test("admin can load promotion by service_request_id", async () => {
  seedServiceRequest();
  await savePromotionDraftAdmin(SERVICE_REQUEST_ID, draftInput);
  const loaded = await getPromotionByServiceRequestIdAdmin(SERVICE_REQUEST_ID);
  assert.ok(loaded);
  assert.equal(loaded.service_request_id, SERVICE_REQUEST_ID);
});
