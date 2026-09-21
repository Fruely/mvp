import { NextResponse } from "next/server";
import type { ConsentFailure } from "./consentService";

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status, headers: NO_STORE });
}

export function jsonItems(items: unknown) {
  return NextResponse.json({ items }, { status: 200, headers: NO_STORE });
}

export function jsonCreated(data: unknown) {
  return NextResponse.json({ data }, { status: 201, headers: NO_STORE });
}

export function jsonFail(result: ConsentFailure) {
  return NextResponse.json(
    { error: result.error },
    { status: result.status, headers: NO_STORE },
  );
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { __invalid_json: true };
  }
}

export function isInvalidJson(body: unknown): boolean {
  return (
    body != null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    "__invalid_json" in (body as Record<string, unknown>)
  );
}
