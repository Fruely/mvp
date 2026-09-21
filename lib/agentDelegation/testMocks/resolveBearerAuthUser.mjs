import { consentHarness } from "../consentHarness.mjs";

export async function resolveBearerAuthUser() {
  return consentHarness.auth;
}
