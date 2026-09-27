import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveClientEventEmail } from "./clientEventEmail.ts";

function client(email: string | null, writes: string[]) {
  return {
    from(table: string) {
      writes.push(table);
      return {};
    },
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: email ? { email } : null }, error: null }),
      },
    },
  } as unknown as SupabaseClient;
}

test("a stored request email is used and the account is not read", async () => {
  let lookups = 0;
  const supabase = {
    auth: {
      admin: {
        getUserById: async () => {
          lookups += 1;
          return { data: { user: { email: "account@example.com" } }, error: null };
        },
      },
    },
  } as unknown as SupabaseClient;
  const resolved = await resolveClientEventEmail(supabase, {
    storedEmail: " stored@example.com ",
    clientUserId: "user-1",
  });
  assert.equal(resolved, "stored@example.com");
  assert.equal(lookups, 0);
});

test("an owned request without a stored email reads the auth user and does not write the row", async () => {
  const writes: string[] = [];
  const resolved = await resolveClientEventEmail(client(" account@example.com ", writes), {
    storedEmail: null,
    clientUserId: "user-1",
  });
  assert.equal(resolved, "account@example.com");
  assert.deepEqual(writes, []);
});
