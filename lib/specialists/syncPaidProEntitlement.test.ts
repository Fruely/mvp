import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPaidProEntitlementMetadata,
  deactivatePaidProEntitlement,
  grantPaidProEntitlement,
  mergeNonDestructivePremiumPaymentMetadata,
  mergePaidProEntitlementMetadata,
} from "@/lib/specialists/proPage/syncPaidProEntitlement";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

type EntitlementRow = {
  specialist_id: string;
  source: "paid" | "gifted" | "admin_granted";
  is_active: boolean;
  granted_at: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function createMockSupabase(initialRows: EntitlementRow[] = []) {
  const rows = new Map(initialRows.map((row) => [row.specialist_id, { ...row }]));

  type Filters = {
    specialistId: string | null;
    source: string | null;
    sourceIn: string[] | null;
    activeOnly: boolean | null;
  };

  function resolveRow(filters: Filters): EntitlementRow | null {
    if (!filters.specialistId) return null;
    const row = rows.get(filters.specialistId);
    if (!row) return null;
    if (filters.source && row.source !== filters.source) return null;
    if (filters.sourceIn && !filters.sourceIn.includes(row.source)) return null;
    if (filters.activeOnly === true && !row.is_active) return null;
    return row;
  }

  function makeFilterChain(
    onComplete: (filters: Filters) => Promise<{ data: unknown; error: null }>,
  ) {
    const filters: Filters = {
      specialistId: null,
      source: null,
      sourceIn: null,
      activeOnly: null,
    };

    const chain = {
      eq(column: string, value: string | boolean) {
        if (column === "specialist_id") filters.specialistId = String(value);
        if (column === "source") filters.source = String(value);
        if (column === "is_active") filters.activeOnly = value === true;
        return chain;
      },
      in(column: string, values: string[]) {
        if (column === "source") filters.sourceIn = values;
        return chain;
      },
      maybeSingle: () => onComplete(filters),
      select() {
        return chain;
      },
      then(
        resolve: (value: { data: unknown; error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) {
        return onComplete(filters).then(resolve, reject);
      },
    };

    return chain;
  }

  const supabase = {
    from(table: string) {
      assert.equal(table, "specialist_pro_entitlements");

      return {
        select() {
          return makeFilterChain(async (filters) => {
            const row = resolveRow(filters);
            return { data: row ? { ...row } : null, error: null };
          });
        },
        insert: async (payload: EntitlementRow) => {
          rows.set(payload.specialist_id, { ...payload });
          return { error: null };
        },
        update: (patch: Partial<EntitlementRow>) =>
          makeFilterChain(async (filters) => {
            const row = resolveRow(filters);
            if (!row) return { data: null, error: null };
            Object.assign(row, patch);
            return { data: { specialist_id: row.specialist_id }, error: null };
          }),
      };
    },
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    rows,
  };
}

describe("syncPaidProEntitlement helpers", () => {
  test("buildPaidProEntitlementMetadata stores premium billing provenance", () => {
    const metadata = buildPaidProEntitlementMetadata(
      { planPaymentId: "pay-1", stripeCheckoutSessionId: "cs_1" },
      "2026-08-22T12:00:00.000Z",
    );
    assert.equal(metadata.plan_code, "premium");
    assert.equal(metadata.plan_payment_id, "pay-1");
    assert.equal(metadata.stripe_checkout_session_id, "cs_1");
  });

  test("mergeNonDestructivePremiumPaymentMetadata keeps gifted provenance data separate", () => {
    const merged = mergeNonDestructivePremiumPaymentMetadata(
      { reason: "gift" },
      buildPaidProEntitlementMetadata({ planPaymentId: "pay-1" }, "2026-08-22T12:00:00.000Z"),
    );
    assert.equal(merged.reason, "gift");
    assert.ok(merged.last_premium_payment);
  });

  test("mergePaidProEntitlementMetadata updates paid billing fields", () => {
    const merged = mergePaidProEntitlementMetadata(null, {
      plan_code: "premium",
      plan_payment_id: "pay-2",
      last_recorded_at: "2026-08-22T12:00:00.000Z",
    });
    assert.equal(merged.plan_payment_id, "pay-2");
    assert.equal(merged.plan_code, "premium");
  });
});

describe("grantPaidProEntitlement", () => {
  test("inserts paid entitlement when none exists", async () => {
    const { supabase, rows } = createMockSupabase();
    const result = await grantPaidProEntitlement(supabase, "spec-1", {
      planPaymentId: "pay-1",
      stripeCheckoutSessionId: "cs_1",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.outcome, "granted");
    const row = rows.get("spec-1");
    assert.equal(row?.source, "paid");
    assert.equal(row?.is_active, true);
  });

  test("reactivates inactive paid entitlement without changing source", async () => {
    const { supabase, rows } = createMockSupabase([
      {
        specialist_id: "spec-1",
        source: "paid",
        is_active: false,
        granted_at: "2026-01-01T00:00:00.000Z",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = await grantPaidProEntitlement(supabase, "spec-1", {
      planPaymentId: "pay-2",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.outcome, "reactivated");
    assert.equal(rows.get("spec-1")?.source, "paid");
    assert.equal(rows.get("spec-1")?.is_active, true);
  });

  test("preserves gifted source on premium payment", async () => {
    const { supabase, rows } = createMockSupabase([
      {
        specialist_id: "spec-1",
        source: "gifted",
        is_active: true,
        granted_at: "2026-01-01T00:00:00.000Z",
        metadata: { reason: "gift" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = await grantPaidProEntitlement(supabase, "spec-1", {
      planPaymentId: "pay-3",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.outcome, "preserved_non_paid");
    assert.equal(rows.get("spec-1")?.source, "gifted");
    assert.equal(rows.get("spec-1")?.is_active, true);
  });

  test("preserves admin_granted source on premium payment", async () => {
    const { supabase, rows } = createMockSupabase([
      {
        specialist_id: "spec-1",
        source: "admin_granted",
        is_active: true,
        granted_at: "2026-01-01T00:00:00.000Z",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = await grantPaidProEntitlement(supabase, "spec-1", {
      planPaymentId: "pay-4",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.outcome, "preserved_non_paid");
    assert.equal(rows.get("spec-1")?.source, "admin_granted");
  });

  test("inactive gifted premium payment returns conflict without mutation", async () => {
    const { supabase, rows } = createMockSupabase([
      {
        specialist_id: "spec-1",
        source: "gifted",
        is_active: false,
        granted_at: "2026-01-01T00:00:00.000Z",
        metadata: { reason: "gift" },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = await grantPaidProEntitlement(supabase, "spec-1", {
      planPaymentId: "pay-5",
      stripeCheckoutSessionId: "cs_conflict",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "pro_entitlement_administrative_inactive_conflict");
      assert.equal(result.retryable, false);
    }
    assert.equal(rows.get("spec-1")?.source, "gifted");
    assert.equal(rows.get("spec-1")?.is_active, false);
    assert.deepEqual(rows.get("spec-1")?.metadata, { reason: "gift" });
  });

  test("inactive admin_granted premium payment returns conflict without mutation", async () => {
    const { supabase, rows } = createMockSupabase([
      {
        specialist_id: "spec-1",
        source: "admin_granted",
        is_active: false,
        granted_at: "2026-01-01T00:00:00.000Z",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = await grantPaidProEntitlement(supabase, "spec-1", {
      planPaymentId: "pay-6",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "pro_entitlement_administrative_inactive_conflict");
      assert.equal(result.retryable, false);
    }
    assert.equal(rows.get("spec-1")?.source, "admin_granted");
    assert.equal(rows.get("spec-1")?.is_active, false);
  });
});

describe("deactivatePaidProEntitlement", () => {
  test("deactivates only paid entitlements", async () => {
    const { supabase, rows } = createMockSupabase([
      {
        specialist_id: "spec-1",
        source: "paid",
        is_active: true,
        granted_at: "2026-01-01T00:00:00.000Z",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = await deactivatePaidProEntitlement(supabase, "spec-1");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.outcome, "deactivated");
    assert.equal(rows.get("spec-1")?.is_active, false);
  });

  test("does not deactivate gifted entitlements", async () => {
    const { supabase, rows } = createMockSupabase([
      {
        specialist_id: "spec-1",
        source: "gifted",
        is_active: true,
        granted_at: "2026-01-01T00:00:00.000Z",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = await deactivatePaidProEntitlement(supabase, "spec-1");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.outcome, "noop");
    assert.equal(rows.get("spec-1")?.is_active, true);
  });

  test("is idempotent when paid entitlement already inactive", async () => {
    const { supabase } = createMockSupabase([
      {
        specialist_id: "spec-1",
        source: "paid",
        is_active: false,
        granted_at: "2026-01-01T00:00:00.000Z",
        metadata: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);
    const result = await deactivatePaidProEntitlement(supabase, "spec-1");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.outcome, "noop");
  });
});

describe("paid pro entitlement integration wiring", () => {
  test("premium webhook path grants paid pro after plan fulfillment", () => {
    const source = readFileSync(
      join(root, "lib/billing/processPlanPaymentWebhook.ts"),
      "utf8",
    );
    assert.match(source, /grantPaidProEntitlement/);
    assert.match(source, /payment\.plan_code === "premium"/);
    assert.match(source, /fulfillPlanPaymentEntitlement/);
  });

  test("basic fulfillment path does not grant paid pro in webhook file", () => {
    const source = readFileSync(
      join(root, "lib/billing/processPlanPaymentWebhook.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /plan_code === "basic"/);
  });

  test("inactive lifecycle reconciliation deactivates paid pro only", () => {
    const source = readFileSync(join(root, "lib/billing/specialistAccessLifecycle.ts"), "utf8");
    assert.match(source, /lifecycleStatus === "inactive"/);
    assert.match(source, /deactivatePaidProEntitlement/);
    assert.doesNotMatch(source, /gifted/);
    assert.doesNotMatch(source, /admin_granted/);
  });

  test("grace lifecycle does not deactivate paid pro in lifecycle module", () => {
    const source = readFileSync(join(root, "lib/billing/specialistAccessLifecycle.ts"), "utf8");
    assert.doesNotMatch(source, /lifecycleStatus === "grace"/);
  });

  test("deactivation does not delete pro page content tables", () => {
    const source = readFileSync(
      join(root, "lib/specialists/proPage/syncPaidProEntitlement.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /specialist_pro_pages/);
    assert.doesNotMatch(source, /specialist_pro_page_drafts/);
    assert.match(source, /specialist_pro_entitlements/);
  });

  test("entitlement status endpoint requires dashboard auth", () => {
    const source = readFileSync(
      join(root, "app/api/specialist/pro-page/entitlement/route.ts"),
      "utf8",
    );
    assert.match(source, /resolveDashboardSpecialistAuth/);
    assert.match(source, /active:/);
    assert.doesNotMatch(source, /req\.json/);
  });

  test("premium success activation polls server-confirmed entitlement", () => {
    const poller = readFileSync(
      join(root, "components/billing/PremiumProActivationPoller.tsx"),
      "utf8",
    );
    assert.match(poller, /\/api\/specialist\/pro-page\/entitlement/);
    assert.match(poller, /payload\.active === true/);
    assert.match(poller, /router\.replace\(proPageHref\)/);

    const billing = readFileSync(
      join(root, "app/[lang]/specialist/(protected)/dashboard/billing/page.tsx"),
      "utf8",
    );
    assert.match(billing, /PremiumProActivationPoller/);
    assert.match(billing, /selectedPaidPlan === "premium"/);
    assert.match(billing, /selectedPaidPlan === "basic"/);
  });

  test("basic checkout success keeps billing processing notice", () => {
    const billing = readFileSync(
      join(root, "app/[lang]/specialist/(protected)/dashboard/billing/page.tsx"),
      "utf8",
    );
    assert.match(billing, /isBasicCheckoutSuccess/);
    assert.match(billing, /dashboard\.billingPage\.checkout\.processingNotice/);
  });

  test("manual checkout cancellation accepts cancelled and cancel", () => {
    const billing = readFileSync(
      join(root, "app/[lang]/specialist/(protected)/dashboard/billing/page.tsx"),
      "utf8",
    );
    assert.match(billing, /checkout === "cancelled"/);
    assert.match(billing, /checkout === "cancel"/);
  });

  test("mid-cycle plan change policy remains untouched", () => {
    const policy = readFileSync(join(root, "lib/billing/planPaymentPolicy.ts"), "utf8");
    assert.match(policy, /plan_change_during_active_period_not_allowed/);
  });

  test("legacy subscription webhook is not the Phase 2B paid-pro sync path", () => {
    const subscription = readFileSync(
      join(root, "lib/billing/processStripeSubscriptionWebhook.ts"),
      "utf8",
    );
    assert.doesNotMatch(subscription, /syncPaidProEntitlement/);
    assert.doesNotMatch(subscription, /grantPaidProEntitlement/);
  });
});
