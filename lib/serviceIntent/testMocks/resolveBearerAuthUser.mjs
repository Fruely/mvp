import { intentHarness } from "./intentRoute.harness.mjs";

export async function resolveBearerAuthUser() {
  if (intentHarness.authKind === "invalid") return { kind: "invalid" };
  if (intentHarness.authKind === "authenticated") {
    return { kind: "authenticated", userId: intentHarness.authUserId };
  }
  return { kind: "absent" };
}
