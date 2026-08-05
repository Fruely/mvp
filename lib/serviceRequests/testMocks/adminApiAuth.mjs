import { NextResponse } from "../../leads/testMocks/next-server.mjs";
import { harness } from "../serviceRequests.harness.mjs";

export function requireAdminToken(request) {
  const expected = harness.adminTokenExpected;
  const header = request.headers.get("x-admin-token");
  const cookie = request.cookies?.get?.("admin_token")?.value;
  const provided = header || cookie;
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
