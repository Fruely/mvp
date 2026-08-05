import { harness } from "../serviceRequests.harness.mjs";

export async function assertAdminSession() {
  if (!harness.adminSessionValid) {
    throw new Error("UNAUTHORIZED");
  }
}

export function isAdminTokenValid() {
  return harness.adminSessionValid;
}

export function requireAdminAuth() {
  if (!harness.adminSessionValid) {
    return { error: "Unauthorized" };
  }
  return null;
}

export const ADMIN_TOKEN_COOKIE = "admin_token";
