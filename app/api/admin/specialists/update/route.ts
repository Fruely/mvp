import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminToken } from '@/lib/adminApiAuth';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { id, status, rejection_reason } = body;

    if (!id || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request: id and status (approved/rejected) required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (status === 'rejected') {
      const reason = typeof rejection_reason === 'string' ? rejection_reason.trim() : '';
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required when rejecting' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    const supabase = createSupabaseServerClient();

    const { data: application, error: fetchError } = await supabase
      .from('specialist_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const app = application as {
      email: string;
      name: string | null;
      phone: string | null;
      category_id: string | null;
      stoir_number: string | null;
      about_short: string | null;
      avatar_url: string | null;
      terms_accepted_at?: string | null;
      terms_version?: string | null;
      status: string;
    };

    if (app.status === status) {
      return NextResponse.json(
        { success: true, updated: application },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // ——— REJECT ———
    if (status === 'rejected') {
      const reason = typeof rejection_reason === 'string' ? rejection_reason.trim() : '';
      const { error: updateError } = await supabase
        .from('specialist_applications')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);

      if (updateError) {
        console.error('[admin] Reject update failed', updateError);
        return NextResponse.json(
          { error: 'Failed to update application' },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const specialistEmail = app.email && String(app.email).trim();
      if (specialistEmail) {
        try {
          await sendEmail({
            to: specialistEmail,
            subject: 'Ваша заявка не одобрена — Freuly',
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2>Заявка не одобрена</h2>
  <p>К сожалению, ваша заявка на платформе Freuly не была одобрена.</p>
  <p><strong>Причина:</strong> ${reason}</p>
  <p>Если у вас есть вопросы, напишите на <a href="mailto:info@freuly.de">info@freuly.de</a></p>
</div>`,
          });
        } catch (emailErr: unknown) {
          console.error('[admin] Reject email failed', emailErr);
        }
      }

      return NextResponse.json(
        { success: true, updated: { ...application, status: 'rejected', rejection_reason: reason } },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // ——— APPROVE (ATOMIC: create specialist first, then update application) ———
    if (!app.name || !app.name.trim()) {
      return NextResponse.json(
        { error: 'Application missing name; cannot create specialist' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    if (!app.phone || !app.phone.trim()) {
      return NextResponse.json(
        { error: 'Application missing phone; cannot create specialist' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    if (!app.category_id) {
      return NextResponse.json(
        { error: 'Application missing category_id; cannot create specialist' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const claimToken = crypto.randomUUID();

    const { data: newSpecialist, error: createError } = await supabase
      .from('specialists')
      .insert({
        name: app.name.trim(),
        email: app.email.trim().toLowerCase(),
        phone: app.phone.trim(),
        category_id: app.category_id,
        avatar_url: app.avatar_url || null,
        stoir_number: app.stoir_number || null,
        bio: app.about_short?.trim() || null,
        status: 'approved',
        approved_at: now.toISOString(),
        claim_token: claimToken,
        claim_token_created_at: now.toISOString(),
        claim_token_expires_at: expiresAt.toISOString(),
        claim_token_used_at: null,
        is_visible: false,
        terms_accepted_at: app.terms_accepted_at || null,
        terms_version: app.terms_version || '1.0',
      })
      .select()
      .single();

    if (createError) {
      console.error('[admin] Specialist insert failed', createError);
      return NextResponse.json(
        { error: 'Failed to create specialist; application remains pending' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { error: updateError } = await supabase
      .from('specialist_applications')
      .update({ status: 'approved' })
      .eq('id', id);

    if (updateError) {
      console.error('[admin] Application status update failed after specialist created', updateError);
      return NextResponse.json(
        { error: 'Specialist created but application status update failed' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const specialistEmail = app.email && String(app.email).trim();
    if (specialistEmail) {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://freuly.de');
        const claimUrl = `${baseUrl}/specialist/claim?token=${encodeURIComponent(claimToken)}`;
        await sendEmail({
          to: specialistEmail,
          subject: 'Ваша заявка одобрена — доступ к кабинету Freuly',
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2 style="color: #2563eb;">Заявка одобрена</h2>
  <p>Ваша заявка на платформе Freuly одобрена.</p>
  <p><a href="${claimUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Войти в кабинет</a></p>
  <p style="color: #666; font-size: 14px;">Ссылка действует 48 часов. После первого входа она станет недействительной.</p>
</div>`,
        });
      } catch (emailErr: unknown) {
        console.error('[admin] Approve email failed', emailErr);
      }
    }

    return NextResponse.json(
      { success: true, updated: { ...application, status: 'approved' }, specialist: newSpecialist },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: unknown) {
    console.error('[admin] Unexpected error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
