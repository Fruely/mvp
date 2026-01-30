import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/specialists/verify-email?token=...&email=...
 * After submit → status = email_unverified.
 * After this handler → status = pending_review.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();
    const email = searchParams.get("email")?.trim();

    if (!token || !email) {
      return NextResponse.redirect(
        new URL("/ua?verify=missing", request.url)
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: specialist, error: fetchError } = await supabase
      .from("specialists")
      .select("id, status, email_verification_token")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (fetchError || !specialist) {
      return NextResponse.redirect(
        new URL("/ua?verify=error", request.url)
      );
    }

    const row = specialist as {
      id: string;
      status: string | null;
      email_verification_token: string | null;
    };

    if (row.status !== "email_unverified") {
      return NextResponse.redirect(
        new URL("/ua?verify=already", request.url)
      );
    }

    if (row.email_verification_token !== token) {
      return NextResponse.redirect(
        new URL("/ua?verify=invalid", request.url)
      );
    }

    const { error: updateError } = await supabase
      .from("specialists")
      .update({
        status: "pending_review",
        email_verification_token: null,
      })
      .eq("id", row.id);

    if (updateError) {
      console.error("[verify-email] update failed", updateError);
      return NextResponse.redirect(
        new URL("/ua?verify=error", request.url)
      );
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
