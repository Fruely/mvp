import { NextRequest } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { disableAgentClient } from "@/lib/agentProvisioning/service";
import {
  isInvalidJson,
  jsonError,
  jsonFail,
  jsonOk,
  readJsonBody,
} from "@/lib/agentProvisioning/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  const params = await Promise.resolve(context.params);
  const body = await readJsonBody(request);
  if (isInvalidJson(body)) {
    return jsonError("invalid body", 400);
  }

  const result = await disableAgentClient(
    createSupabaseServerClient(),
    params.id,
    body,
  );
  if (result.kind !== "ok") return jsonFail(result);
  return jsonOk(result.value);
}
