import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/specialists/verify-email?token=...
 * After submit → status = email_pending.
 * After this handler → status = pending_review.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.redirect(
        new URL("/ua?verify=missing", request.url)
      );
    }

    const supabase = createSupabaseServerClient();

    // Find application by token (more secure than email)
    const { data: application, error: fetchError } = await supabase
      .from("specialist_applications")
      .select("id, email, status, email_verification_token")
      .eq("email_verification_token", token)
      .maybeSingle();

    if (fetchError || !application) {
      console.error("[verify-email] fetch failed", fetchError);
      return NextResponse.redirect(
        new URL("/ua?verify=invalid", request.url)
      );
    }

    const row = application as {
      id: string;
      email: string;
      status: string | null;
      email_verification_token: string | null;
    };

    if (row.status !== "email_pending") {
      return NextResponse.redirect(
        new URL("/ua?verify=already", request.url)
      );
    }

    // Update status to pending_review and set email_confirmed_at
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("specialist_applications")
      .update({
        status: "pending_review",
        email_verification_token: null,
        email_confirmed_at: now,
      })
      .eq("id", row.id);

    if (updateError) {
      console.error("[verify-email] update failed", updateError);
      return NextResponse.redirect(
        new URL("/ua?verify=error", request.url)
      );
    }

    // Notify admin about new application
    try {
      await sendEmail({
        to: "info@freuly.de",
        subject: "Новая заявка специалиста на модерацию — Freuly",
        html: `<p>Получена новая заявка специалиста для модерации.</p>
<p><strong>Email:</strong> ${row.email}</p>
<p><a href="https://freuly.de/admin/specialists">Перейти к модерации</a></p>`,
      });
    } catch (emailError) {
      console.error("[verify-email] admin notification failed", emailError);
      // Don't fail the whole flow if admin email fails
    }

    return NextResponse.redirect(
      new URL("/ua?verify=ok", request.url)
    );
  } catch (err) {
    console.error("[verify-email] unexpected error", err);
    return NextResponse.redirect(
      new URL("/ua?verify=error", request.url)
    );
  }
}
