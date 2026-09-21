import { NextRequest } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { createAgentClient } from "@/lib/agentProvisioning/service";
import {
  isInvalidJson,
  jsonCreated,
  jsonError,
  jsonFail,
  readJsonBody,
} from "@/lib/agentProvisioning/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  const body = await readJsonBody(request);
  if (isInvalidJson(body)) {
    return jsonError("invalid body", 400);
  }

  const result = await createAgentClient(createSupabaseServerClient(), body);
  if (result.kind !== "ok") return jsonFail(result);
  return jsonCreated(result.value);
}
