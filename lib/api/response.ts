import { NextResponse } from "next/server";

type JsonInit = ResponseInit;

export function jsonNoStore(body: unknown, init: JsonInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
