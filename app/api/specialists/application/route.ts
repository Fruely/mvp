import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
 
    const {
      email,
      name,
      phone,
      category_id,
      stoir_number,
      about_short,
      photo_base64,
      proof_link,
      specialist_rules_accepted,
    } = body;

    // -----------------------------
    // Validation (required: name, phone, email, category_id, proof_link, terms)
    // -----------------------------
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: "Phone is required" },
        { status: 400 }
      );
    }
    if (!category_id || typeof category_id !== "string" || !category_id.trim()) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }
    if (!proof_link || typeof proof_link !== "string" || !proof_link.trim()) {
      return NextResponse.json(
        { error: "Proof document is required" },
        { status: 400 }
      );
    }
    if (specialist_rules_accepted !== true) {
      return NextResponse.json(
        { error: "Specialist placement rules must be accepted" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailVerificationToken = crypto.randomUUID();
    const now = new Date().toISOString();
    const emailIsConfigured = Boolean(
      process.env.RESEND_API_KEY &&
      (process.env.MAIL_FROM || process.env.RESEND_FROM_EMAIL)
    );
    const shouldRequireEmailVerification = emailIsConfigured;

    const applicationData = {
      email: normalizedEmail,
      name: name.trim(),
      phone: phone.trim(),
      category_id: category_id.trim(),
      stoir_number: stoir_number?.trim() || null,
      about_short: about_short?.trim() || null,
      avatar_url: photo_base64 || null,
      proof_link: proof_link.trim(),
      status: shouldRequireEmailVerification ? "email_pending" : "pending_review",
      email_verification_token: shouldRequireEmailVerification
        ? emailVerificationToken
        : null,
      email_confirmation_sent_at: shouldRequireEmailVerification ? now : null,
      email_confirmed_at: shouldRequireEmailVerification ? null : now,
      terms_accepted_at: now,
      terms_version: process.env.TERMS_VERSION || "1.0",
      specialist_rules_accepted_at: now,
      specialist_rules_version: process.env.SPECIALIST_RULES_VERSION || "1",
    };

    const supabase = createSupabaseServerClient();

    // -----------------------------
    // Insert application
    // -----------------------------
    const { data: insertedApplication, error } = await supabase
      .from("specialist_applications")
      .insert(applicationData)
      .select("id")
      .single();

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

    if (!shouldRequireEmailVerification) {
      console.warn(
        "[specialists/application] Email service is not configured. " +
          "Saved application directly as pending_review."
      );
      return NextResponse.json({
        success: true,
        email_verification_required: false,
      });
    }

    const verifyUrl = `https://freuly.de/api/specialists/verify-email?token=${encodeURIComponent(emailVerificationToken)}`;

    try {
      await sendEmail({
        to: applicationData.email,
        subject: "Ваша заявка специалиста получена — Freuly",
        html: `<p>Здравствуйте!</p>
<p>Мы получили вашу заявку специалиста на платформе <b>Freuly</b>.</p>
<p>Подтвердите email по ссылке: <a href="${verifyUrl}">${verifyUrl}</a></p>
<p>Наша команда рассмотрит заявку и свяжется с вами по этому email после проверки.</p>
<p>С уважением,<br/>Команда Freuly</p>`,
      });
    } catch (emailError) {
      console.error("[specialists/application] Email send failed:", emailError);
      if (process.env.NODE_ENV !== "production" && insertedApplication?.id) {
        await supabase
          .from("specialist_applications")
          .update({
            status: "pending_review",
            email_verification_token: null,
            email_confirmation_sent_at: null,
            email_confirmed_at: now,
          })
          .eq("id", insertedApplication.id);

        return NextResponse.json({
          success: true,
          email_verification_required: false,
        });
      }

      return NextResponse.json(
        { error: "Не вдалося надіслати лист підтвердження. Спробуйте пізніше." },
        { status: 502 }
      );
    }

    // -----------------------------
    // Success
    // -----------------------------
    return NextResponse.json({ success: true, email_verification_required: true });

  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
