import { NextRequest } from "next/server";
import {
  createUserDelegation,
  listUserDelegations,
} from "@/lib/agentDelegation/consentService";
import {
  isInvalidJson,
  jsonCreated,
  jsonError,
  jsonFail,
  jsonItems,
  readJsonBody,
} from "@/lib/agentDelegation/consentHttp";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await resolveBearerAuthUser(request);
  if (auth.kind !== "authenticated") {
    return jsonError("unauthorized", 401);
  }

  const result = await listUserDelegations(
    createSupabaseServerClient(),
    auth.userId,
  );
  if (result.kind !== "ok") return jsonFail(result);
  return jsonItems(result.value);
}

export async function POST(request: NextRequest) {
  const auth = await resolveBearerAuthUser(request);
  if (auth.kind !== "authenticated") {
    return jsonError("unauthorized", 401);
  }

  const body = await readJsonBody(request);
  if (isInvalidJson(body)) {
    return jsonError("invalid body", 400);
  }

  const result = await createUserDelegation(
    createSupabaseServerClient(),
    auth.userId,
    body,
  );
  if (result.kind !== "ok") return jsonFail(result);
  return jsonCreated(result.value);
}
