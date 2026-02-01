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
    const emailVerificationToken = crypto.randomUUID();
    const now = new Date().toISOString();

    // -----------------------------
    // Prepare data
    // -----------------------------
    const applicationData = {
      email: normalizedEmail,
      stoir_number: stoir_number?.trim() || null,
      about_short: about_short?.trim() || null,
      avatar_url: photo_base64 || null,
      status: "email_pending",
      email_verification_token: emailVerificationToken,
      email_confirmation_sent_at: now,
      terms_accepted_at: now,
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
      const message =
        error.code === "23505"
          ? "Заявка з таким email вже існує."
          : error.message?.includes("row-level security")
            ? "Немає прав на створення заявки."
            : "Не вдалося зберегти заявку. Спробуйте пізніше або зверніться до підтримки.";
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    const verifyUrl = `https://freuly.de/api/specialists/verify-email?token=${encodeURIComponent(emailVerificationToken)}`;

    await sendEmail({
      to: applicationData.email,
      subject: "Ваша заявка специалиста получена — Freuly",
      html: `<p>Здравствуйте!</p>
<p>Мы получили вашу заявку специалиста на платформе <b>Freuly</b>.</p>
<p>Подтвердите email по ссылке: <a href="${verifyUrl}">${verifyUrl}</a></p>
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
