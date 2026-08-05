import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminSession";

/**
 * Admin guard for /api/admin/* route handlers.
 * Accepts admin session cookie or x-admin-token header.
 */
let hasLoggedMissingToken = false;

export function requireAdminToken(request: NextRequest): NextResponse | null {
  if (!process.env.ADMIN_API_TOKEN) {
    if (!hasLoggedMissingToken) {
      hasLoggedMissingToken = true;
      console.error("[admin] Missing ADMIN_API_TOKEN env var");
    }
  }
  return requireAdminAuth(request);
}
