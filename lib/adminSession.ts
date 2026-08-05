import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const ADMIN_TOKEN_COOKIE = "admin_token";

export function isAdminTokenValid(token: string | null | undefined): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false;
  return typeof token === "string" && token.length > 0 && token === expected;
}

/** Server Components / Server Actions: require admin cookie session. */
export async function assertAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!isAdminTokenValid(token)) {
    throw new Error("UNAUTHORIZED");
  }
}

/**
 * Route handlers: accept admin cookie (browser session behind /admin layout)
 * or x-admin-token (scripts / legacy callers).
 */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const noStoreHeaders = { "Cache-Control": "no-store" };
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500, headers: noStoreHeaders },
    );
  }

  const cookieToken = request.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  if (isAdminTokenValid(cookieToken)) return null;

  const headerToken = request.headers.get("x-admin-token");
  if (isAdminTokenValid(headerToken)) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
}
