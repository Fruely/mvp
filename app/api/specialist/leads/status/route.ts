import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

const ALLOWED_STATUSES = ["new", "accepted", "contacted", "closed"] as const;
type LeadStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAuth = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Reads/writes use the service-role client. Ownership is enforced explicitly:
    // resolve the specialist by user_id = auth.uid(), then update the lead only
    // where id = leadId AND specialist_id = specialist.id.
    const supabase = createServiceClient();

    const body = await request.json().catch(() => null);
    const leadId = body?.lead_id;
    const nextStatus = body?.status;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json(
        { error: "lead_id is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!nextStatus || typeof nextStatus !== "string") {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!ALLOWED_STATUSES.includes(nextStatus as LeadStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data: specialist, error: specialistError } = await supabase
      .from("specialists")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (specialistError) {
      console.error("[specialist/leads/status] specialist lookup failed", specialistError);
      return NextResponse.json(
        { error: "Failed to verify specialist access" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!specialist?.id) {
      return NextResponse.json(
        { error: "Specialist not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { data, error } = await supabase
      .from("leads")
      .update({ status: nextStatus })
      .eq("id", leadId)
      .eq("specialist_id", specialist.id)
      .select("id, status, client_email, created_at")
      .maybeSingle();

    if (error) {
      console.error("[specialist/leads/status] update failed", error);
      return NextResponse.json(
        { error: "Failed to update lead status" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (nextStatus === "accepted" && typeof data.client_email === "string" && data.client_email.trim()) {
      try {
        await sendEmail({
          to: data.client_email.trim(),
          subject: "Специалист принял вашу заявку",
          html: "<p>Здравствуйте!</p><p>Специалист подтвердил получение вашей заявки и свяжется с вами в ближайшее время.</p>",
        });
      } catch (emailErr) {
        console.error("[specialist/leads/status] failed to send accepted email", emailErr);
      }
    }

    return NextResponse.json(
      { data },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[specialist/leads/status] unexpected error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

