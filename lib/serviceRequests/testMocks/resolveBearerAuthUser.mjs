import { harness } from "../serviceRequests.harness.mjs";

export async function resolveBearerAuthUser() {
  if (harness.authInvalid) {
    return { kind: "invalid" };
  }
  if (typeof harness.authUserId === "string" && harness.authUserId) {
    return { kind: "authenticated", userId: harness.authUserId };
  }
  return { kind: "absent" };
}
