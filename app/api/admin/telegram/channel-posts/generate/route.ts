import { NextRequest } from "next/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { jsonNoStore } from "@/lib/api/response";
import { generateTelegramChannelPost } from "@/lib/telegram/generateChannelPost";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await generateTelegramChannelPost({
    topic: typeof body.topic === "string" ? body.topic : null,
    context: typeof body.context === "string" ? body.context : null,
  });

  if (!result.ok) {
    return jsonNoStore({ error: result.error }, { status: result.status });
  }

  return jsonNoStore({
    title: result.title,
    body_text: result.body_text,
  });
}
