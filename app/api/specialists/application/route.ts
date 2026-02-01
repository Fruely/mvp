import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      email,
      stoir_number,
      about_short,
      photo_base64,
      terms_accepted,
    } = body;

    // -----------------------------
    // Basic validation
    // -----------------------------
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (terms_accepted !== true) {
      return NextResponse.json(
        { error: "Terms must be accepted" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------
    // Prepare data
    // -----------------------------
    const applicationData = {
      email: normalizedEmail,
      stoir_number: stoir_number?.trim() || null,
      about_short: about_short?.trim() || null,
      avatar_url: photo_base64 || null,
      status: "pending",
      terms_accepted_at: new Date().toISOString(),
      terms_version: process.env.TERMS_VERSION || "1.0",
    };

    const supabase = createSupabaseServerClient();

    // -----------------------------
    // Insert application
    // -----------------------------
    const { error } = await supabase
      .from("specialist_applications")
      .insert(applicationData);

    if (error) {
      console.error("Application insert failed:", error);
      return NextResponse.json(
        { error: "Failed to submit application" },
        { status: 500 }
      );
    }

    await sendEmail({
      to: applicationData.email,
      subject: "Ваша заявка специалиста получена — Freuly",
      html: `<p>Здравствуйте!</p>
<p>Мы получили вашу заявку специалиста на платформе <b>Freuly</b>.</p>
<p>Наша команда рассмотрит заявку и свяжется с вами по этому email после проверки.</p>
<p>С уважением,<br/>Команда Freuly</p>`,
    });

    // -----------------------------
    // Success
    // -----------------------------
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
