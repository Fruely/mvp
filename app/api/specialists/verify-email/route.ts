import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
const DEFAULT_CATEGORY_LABEL = "Категория";

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

    const { data: application, error: fetchError } = await supabase
      .from("specialist_applications")
      .select("id, email, name, phone, category_id, about_short, proof_link, created_at, status, email_verification_token")
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
      name: string | null;
      phone: string | null;
      category_id: string | null;
      about_short: string | null;
      proof_link: string | null;
      created_at: string | null;
      status: string | null;
      email_verification_token: string | null;
    };

    if (row.status !== "email_pending") {
      return NextResponse.redirect(
        new URL("/ua?verify=already", request.url)
      );
    }

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

    let categoryLabel = DEFAULT_CATEGORY_LABEL;
    if (row.category_id) {
      const { data: cat } = await supabase
        .from("categories")
        .select("title, slug")
        .eq("id", row.category_id)
        .maybeSingle();
      if (cat) {
        categoryLabel = (cat as { title?: string }).title || DEFAULT_CATEGORY_LABEL;
      }
    }
    const createdLabel = row.created_at
      ? new Date(row.created_at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
      : "—";

    try {
      await sendEmail({
        to: "info@freuly.de",
        subject: "Новая заявка специалиста на модерацию — Freuly",
        html: `<p>Получена новая заявка специалиста для модерации.</p>
<ul>
<li><strong>Email:</strong> ${row.email ?? "—"}</li>
<li><strong>Имя:</strong> ${row.name ?? "—"}</li>
<li><strong>Телефон:</strong> ${row.phone ?? "—"}</li>
<li><strong>Категория:</strong> ${categoryLabel}</li>
<li><strong>Дата заявки:</strong> ${createdLabel}</li>
</ul>
${row.about_short ? `<p><strong>О себе:</strong><br/>${row.about_short}</p>` : ""}
${row.proof_link ? `<p><strong>Документ:</strong> <a href="${row.proof_link}">${row.proof_link}</a></p>` : ""}
<p><a href="https://freuly.de/admin/specialists">Перейти к модерации</a></p>`,
      });
    } catch (emailError) {
      console.error("[verify-email] admin notification failed", emailError);
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
