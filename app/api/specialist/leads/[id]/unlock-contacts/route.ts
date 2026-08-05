import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { isLeadContactUnlocked } from "@/lib/leads/contactUnlock";
import { DASHBOARD_LEAD_FULL_SELECT } from "@/lib/leads/contactUnlock";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function unlockedPayload(row: {
  id: string;
  contact_unlocked_at: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
}) {
  return {
    id: row.id,
    contact_unlocked_at: row.contact_unlocked_at,
    client_name: row.client_name,
    client_email: row.client_email,
    client_phone: row.client_phone,
    message: row.message,
  };
}

function normalizeRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    status: typeof row.status === "string" ? row.status : null,
    contact_unlocked_at:
      typeof row.contact_unlocked_at === "string" ? row.contact_unlocked_at : null,
    client_name: typeof row.client_name === "string" ? row.client_name.trim() : null,
    client_email: typeof row.client_email === "string" ? row.client_email.trim() : null,
    client_phone: typeof row.client_phone === "string" ? row.client_phone.trim() : null,
    message: typeof row.message === "string" ? row.message : null,
  };
}

export async function POST(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id: leadId } = await Promise.resolve(context.params);
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "invalid_lead_id" }, { status: 400, headers: NO_STORE });
    }

    const supabaseAuth = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
    }

    const supabase = createServiceClient();

    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (specialistError) {
      console.error("[specialist/leads/unlock-contacts] specialist lookup failed", specialistError);
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }

    if (!specialist?.id) {
      return NextResponse.json({ error: "specialist_not_found" }, { status: 404, headers: NO_STORE });
    }

    if (specialist.status === "blocked") {
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("leads")
      .select(DASHBOARD_LEAD_FULL_SELECT)
      .eq("id", leadId)
      .eq("specialist_id", specialist.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[specialist/leads/unlock-contacts] fetch failed", fetchError);
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }

    if (!existing) {
      return NextResponse.json({ error: "lead_not_found" }, { status: 404, headers: NO_STORE });
    }

    const normalized = normalizeRow(existing as Record<string, unknown>);

    if (isLeadContactUnlocked(normalized)) {
      return NextResponse.json({ data: unlockedPayload(normalized) }, { status: 200, headers: NO_STORE });
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update({
        contact_unlocked_at: nowIso,
        contact_unlocked_by: user.id,
      })
      .eq("id", leadId)
      .eq("specialist_id", specialist.id)
      .is("contact_unlocked_at", null)
      .select(DASHBOARD_LEAD_FULL_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error("[specialist/leads/unlock-contacts] update failed", updateError);
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }

    let resultRow = updated ? normalizeRow(updated as Record<string, unknown>) : null;
    const didPersistFirstUnlock = Boolean(updated);

    if (!resultRow) {
      const { data: refetched } = await supabase
        .from("leads")
        .select(DASHBOARD_LEAD_FULL_SELECT)
        .eq("id", leadId)
        .eq("specialist_id", specialist.id)
        .maybeSingle();
      if (!refetched || !isLeadContactUnlocked(normalizeRow(refetched as Record<string, unknown>))) {
        return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
      }
      resultRow = normalizeRow(refetched as Record<string, unknown>);
    }

    if (didPersistFirstUnlock && resultRow.client_email) {
      try {
        await sendEmail({
          to: resultRow.client_email,
          subject: "Специалист готов связаться с вами",
          html: "<p>Здравствуйте!</p><p>Специалист открыл вашу заявку и свяжется с вами в ближайшее время.</p>",
        });
      } catch (emailErr) {
        console.error("[specialist/leads/unlock-contacts] client email failed", emailErr);
      }
    }

    return NextResponse.json({ data: unlockedPayload(resultRow) }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[specialist/leads/unlock-contacts] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
