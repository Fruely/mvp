import { createBillingMockAuthClient } from "./promotedAccess.harness.mjs";

export function createSupabaseServerClient() {
  return createBillingMockAuthClient();
}
