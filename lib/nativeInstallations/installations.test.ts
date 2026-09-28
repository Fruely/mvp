import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { decideInstallationUser } from "./session.ts";
import {
  deactivateNativeInstallation,
  installationCommand,
  registerNativeInstallation,
} from "./installations.ts";
import { invalidatePushEndpoint } from "../push/endpoints.ts";

const INSTALLATION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

type Row = {
  installation_id: string;
  user_id: string;
  platform: string;
  active: boolean;
  registered_at: string;
  last_seen_at: string;
  deactivated_at: string | null;
};

function memory() {
  const installations: Row[] = [];
  const pushEndpoints: Array<Record<string, unknown>> = [];
  function find(filters: Array<[string, unknown]>) {
    return installations.find((row) => filters.every(([key, value]) => (row as Record<string, unknown>)[key] === value)) ?? null;
  }
  const supabase = {
    from(table: string) {
      const state: { filters: Array<[string, unknown]>; patch?: Record<string, unknown> } = { filters: [] };
      const api = {
        select() {
          return api;
        },
        eq(column: string, value: unknown) {
          state.filters.push([column, value]);
          return api;
        },
        apply() {
          if (!state.patch) return null;
          if (table === "push_endpoints") {
            const found = pushEndpoints.find((row) => state.filters.every(([key, value]) => row[key] === value));
            if (found) Object.assign(found, state.patch);
            state.patch = undefined;
            return found ? { id: found.id } : null;
          }
          const found = find(state.filters);
          if (found) Object.assign(found, state.patch);
          state.patch = undefined;
          return found;
        },
        then(resolve: (value: { data: null; error: null }) => void) {
          api.apply();
          resolve({ data: null, error: null });
        },
        async maybeSingle() {
          if (state.patch) return { data: api.apply(), error: null };
          if (table === "push_endpoints") {
            const found = pushEndpoints.find((row) => state.filters.every(([key, value]) => row[key] === value)) ?? null;
            return { data: found, error: null };
          }
          return { data: find(state.filters), error: null };
        },
        update(patch: Record<string, unknown>) {
          state.patch = patch;
          return api;
        },
        insert(patch: Row | Record<string, unknown>) {
          if (table === "push_endpoints") {
            pushEndpoints.push(patch);
            return { select: () => ({ maybeSingle: async () => ({ data: { id: "push-1" }, error: null }) }) };
          }
          const row = patch as Row;
          if (installations.some((item) => item.installation_id === row.installation_id)) {
            return { select: () => ({ maybeSingle: async () => ({ data: null, error: { code: "23505" } }) }) };
          }
          installations.push({ ...row });
          return {
            select: () => ({
              maybeSingle: async () => ({ data: { installation_id: row.installation_id }, error: null }),
            }),
          };
        },
      };
      return api;
    },
  };
  return { installations, pushEndpoints, supabase: supabase as unknown as SupabaseClient };
}

test("1-3. only the authenticated user is stored, and a body user id is ignored", () => {
  const command = installationCommand("user-a", {
    installationId: INSTALLATION,
    platform: "android",
    user_id: "user-b",
    userId: "user-b",
  });
  assert.equal(command.actorUserId, "user-a");
  assert.equal("user_id" in command, false);
  assert.deepEqual(decideInstallationUser({ kind: "absent" }, null), { status: 401 });
  assert.deepEqual(decideInstallationUser({ kind: "invalid" }, "user-a"), { status: 401 });
  const registerRoute = readFileSync(new URL("../../app/api/native/installations/route.ts", import.meta.url), "utf8");
  const deactivateRoute = readFileSync(new URL("../../app/api/native/installations/deactivate/route.ts", import.meta.url), "utf8");
  assert.match(registerRoute, /status: 401/);
  assert.equal(registerRoute.includes("user_id"), false);
  assert.equal(registerRoute.includes("record.userId"), false);
  assert.equal(registerRoute.includes("body.userId"), false);
  assert.match(registerRoute, /installationCommand\(auth\.userId/);
  assert.match(deactivateRoute, /actorUserId: auth\.userId/);
  assert.equal(deactivateRoute.includes("user_id"), false);
});

test("4-6. first registration is active and a refresh keeps registered_at", async () => {
  const db = memory();
  const created = await registerNativeInstallation(db.supabase, {
    actorUserId: "user-a",
    installationId: INSTALLATION,
    platform: "android",
    now: "2026-09-28T08:00:00.000Z",
  });
  assert.deepEqual(created, { installationId: INSTALLATION, active: true });
  assert.equal(db.installations.length, 1);
  assert.equal(db.installations[0].active, true);
  assert.equal(db.installations[0].user_id, "user-a");
  assert.equal(db.installations[0].registered_at, "2026-09-28T08:00:00.000Z");
  const refreshed = await registerNativeInstallation(db.supabase, {
    actorUserId: "user-a",
    installationId: INSTALLATION.toUpperCase(),
    platform: "android",
    now: "2026-09-28T09:00:00.000Z",
  });
  assert.equal("active" in refreshed && refreshed.active, true);
  assert.equal(db.installations.length, 1);
  assert.equal(db.installations[0].registered_at, "2026-09-28T08:00:00.000Z");
  assert.equal(db.installations[0].last_seen_at, "2026-09-28T09:00:00.000Z");
  assert.equal(db.installations[0].deactivated_at, null);
});

test("7-8. deactivation is per installation", async () => {
  const db = memory();
  await registerNativeInstallation(db.supabase, {
    actorUserId: "user-a",
    installationId: INSTALLATION,
    platform: "android",
    now: "2026-09-28T08:00:00.000Z",
  });
  await registerNativeInstallation(db.supabase, {
    actorUserId: "user-a",
    installationId: OTHER,
    platform: "ios",
    now: "2026-09-28T08:00:00.000Z",
  });
  const stranger = await deactivateNativeInstallation(db.supabase, {
    actorUserId: "user-b",
    installationId: INSTALLATION,
    now: "2026-09-28T10:00:00.000Z",
  });
  assert.deepEqual(stranger, { error: "forbidden" });
  const disabled = await deactivateNativeInstallation(db.supabase, {
    actorUserId: "user-a",
    installationId: INSTALLATION,
    now: "2026-09-28T10:00:00.000Z",
  });
  assert.deepEqual(disabled, { active: false });
  const android = db.installations.find((row) => row.installation_id === INSTALLATION);
  const iphone = db.installations.find((row) => row.installation_id === OTHER);
  assert.equal(android?.active, false);
  assert.equal(android?.deactivated_at, "2026-09-28T10:00:00.000Z");
  assert.equal(iphone?.active, true);
  assert.equal(iphone?.deactivated_at, null);
  assert.equal(db.installations.length, 2);
});

test("9. the same installation can belong to only one current user", async () => {
  const db = memory();
  await registerNativeInstallation(db.supabase, {
    actorUserId: "user-a",
    installationId: INSTALLATION,
    platform: "android",
    now: "2026-09-28T08:00:00.000Z",
  });
  await deactivateNativeInstallation(db.supabase, {
    actorUserId: "user-a",
    installationId: INSTALLATION,
    now: "2026-09-28T09:00:00.000Z",
  });
  await registerNativeInstallation(db.supabase, {
    actorUserId: "user-b",
    installationId: INSTALLATION,
    platform: "android",
    now: "2026-09-28T10:00:00.000Z",
  });
  assert.equal(db.installations.length, 1);
  assert.equal(db.installations[0].user_id, "user-b");
  assert.equal(db.installations[0].active, true);
  assert.equal(db.installations[0].deactivated_at, null);
  assert.equal(db.installations[0].registered_at, "2026-09-28T08:00:00.000Z");

  const interrupted = memory();
  await registerNativeInstallation(interrupted.supabase, {
    actorUserId: "user-a",
    installationId: INSTALLATION,
    platform: "android",
    now: "2026-09-28T08:00:00.000Z",
  });
  await registerNativeInstallation(interrupted.supabase, {
    actorUserId: "user-b",
    installationId: INSTALLATION,
    platform: "ios",
    now: "2026-09-28T11:00:00.000Z",
  });
  assert.equal(interrupted.installations.length, 1);
  assert.equal(interrupted.installations[0].user_id, "user-b");
  assert.equal(interrupted.installations[0].active, true);
  assert.equal(interrupted.installations.filter((row) => row.active).length, 1);
});

test("10-12. push permission, preference and token invalidation do not own the installation", async () => {
  const db = memory();
  await registerNativeInstallation(db.supabase, {
    actorUserId: "user-a",
    installationId: INSTALLATION,
    platform: "android",
    now: "2026-09-28T08:00:00.000Z",
  });
  db.pushEndpoints.push({
    id: "push-1",
    user_id: "user-a",
    enabled: true,
    token: "ExponentPushToken[aaaaaaaa]",
    invalidated_at: null,
  });
  await invalidatePushEndpoint(db.supabase, "push-1", "user-a");
  assert.equal(db.pushEndpoints[0].enabled, false);
  assert.equal(db.pushEndpoints[0].token, null);
  assert.equal(db.installations[0].active, true);
  assert.equal(db.installations[0].deactivated_at, null);
  const registerSource = readFileSync(new URL("./installations.ts", import.meta.url), "utf8");
  assert.equal(registerSource.includes("permission"), false);
  assert.equal(registerSource.includes("push_endpoints"), false);
  assert.equal(registerSource.includes("notification_preferences"), false);
  const pushSource = readFileSync(new URL("../push/endpoints.ts", import.meta.url), "utf8");
  assert.equal(pushSource.includes("native_installations"), false);
});

test("the installation table is one row per installation and stores no push secret", () => {
  const sql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-28_native_installations.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /installation_id uuid PRIMARY KEY/);
  assert.doesNotMatch(sql, /UNIQUE \(user_id, installation_id\)/);
  assert.match(sql, /REFERENCES auth\.users/);
  assert.match(sql, /platform IN \('ios', 'android'\)/);
  assert.match(sql, /idx_native_installations_user_active/);
  assert.match(sql, /WHERE active = true/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON public\.native_installations FROM anon, authenticated/);
  assert.match(sql, /GRANT ALL ON public\.native_installations TO service_role/);
  assert.equal(sql.includes("token"), false);
  assert.equal(sql.includes("email"), false);
  assert.equal(sql.includes("phone"), false);
});
