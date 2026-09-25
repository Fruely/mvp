/**
 * Shared state for the `POST /api/intent/extract` contract tests.
 * Everything the route touches outside pure logic is driven from here.
 */
export const intentHarness = {
  /** `null` means "no credentials configured", which must stop the call. */
  aiAuth: {
    token: "test-token",
    endpoint: "https://ai-gateway.test/v1/chat/completions",
    model: "openai/gpt-5-mini",
    transport: "gateway",
  },
  /** Recorded `requestAiJson` invocations. Its length proves whether we spent money. */
  modelCalls: [],
  /** Next `requestAiJson` outcome: { ok: true, data } or { ok: false, code, status }. */
  modelResult: null,
  /** Per-namespace rate-limit outcomes. */
  rateLimit: {},
  /** `absent`, `invalid` or an authenticated user id. */
  authKind: "absent",
  authUserId: null,
  /** Tables the route asked Supabase for, and any write attempt. */
  supabaseTables: [],
  supabaseWrites: [],
  /** Category suggestion rows returned for the compatibility lookup. */
  categoryRows: [],
  /** Everything written through console during the request. */
  logs: [],
};

export function resetIntentHarness() {
  intentHarness.aiAuth = {
    token: "test-token",
    endpoint: "https://ai-gateway.test/v1/chat/completions",
    model: "openai/gpt-5-mini",
    transport: "gateway",
  };
  intentHarness.modelCalls = [];
  intentHarness.modelResult = null;
  intentHarness.rateLimit = {};
  intentHarness.authKind = "absent";
  intentHarness.authUserId = null;
  intentHarness.supabaseTables = [];
  intentHarness.supabaseWrites = [];
  intentHarness.categoryRows = [];
  intentHarness.logs = [];
}
