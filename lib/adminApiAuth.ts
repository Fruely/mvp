import { NextRequest, NextResponse } from 'next/server';

/**
 * Minimal temporary admin guard:
 * - expects header `x-admin-token`
 * - compares to `process.env.ADMIN_API_TOKEN`
 */
export function requireAdminToken(request: NextRequest): NextResponse | null {
  const noStoreHeaders = { 'Cache-Control': 'no-store' };
  const expectedToken = process.env.ADMIN_API_TOKEN;
  if (!expectedToken) {
    console.error('[admin] Missing ADMIN_API_TOKEN env var');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500, headers: noStoreHeaders }
    );
  }

  const providedToken = request.headers.get('x-admin-token');
  if (!providedToken || providedToken !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  return null;
}

