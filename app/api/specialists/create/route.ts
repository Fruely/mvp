import { NextResponse } from "next/server";
const DEPRECATION_HEADERS = {
  "X-API-Deprecated": "true",
  "X-API-Replacement": "/api/specialists/application",
};
const DEPRECATION_PAYLOAD = {
  deprecated: true,
  replacement: "/api/specialists/application",
};

export async function POST() {
  return NextResponse.json(
    {
      error: "Endpoint removed. Use /api/specialists/application.",
      ...DEPRECATION_PAYLOAD,
    },
    { status: 410, headers: DEPRECATION_HEADERS }
  );
}
