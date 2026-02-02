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

    const supabase = createSupabaseServerClient();

    // Find application in specialist_applications
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

    const currentStatus = (application as { status?: string }).status;
    if (currentStatus === status) {
      return NextResponse.json(
        { success: true, updated: application },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const updateData: Record<string, any> = {
      status,
    };

    if (status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      if (rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }
    }

    // Update application status
    const { error, data } = await supabase
      .from('specialist_applications')
      .update(updateData)
      .eq('id', id)
      .select();

    let specialistRow: any = null;

    // If approved, create specialist record
    if (status === 'approved') {
      const app = application as {
        email: string;
        stoir_number?: string | null;
        about_short?: string | null;
        avatar_url?: string | null;
        terms_accepted_at?: string | null;
        terms_version?: string | null;
      };

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const claimToken = crypto.randomUUID();

      // Create specialist record
      const { data: newSpecialist, error: createError } = await supabase
        .from('specialists')
        .insert({
          email: app.email,
          first_name: null, // Will be filled later
          phone: null,
          bio: app.about_short || null,
          avatar_url: app.avatar_url || null,
          stoir_number: app.stoir_number || null,
          status: 'approved',
          approved_at: now.toISOString(),
          claim_token: claimToken,
          claim_token_created_at: now.toISOString(),
          claim_token_expires_at: expiresAt.toISOString(),
          claim_token_used_at: null,
          terms_accepted_at: app.terms_accepted_at || null,
          terms_version: app.terms_version || '1.0',
        })
        .select()
        .single();

      if (createError) {
        console.error('[admin] Failed to create specialist:', createError);
        return NextResponse.json(
          { error: 'Failed to create specialist record' },
          { status: 500, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      specialistRow = newSpecialist;
    }

    if (error) {
      console.error('[admin] Error updating specialist:', error);
      return NextResponse.json(
        { error: 'Failed to update specialist' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Specialist not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const applicationRow = data[0] as {
      email?: string | null;
    };
    const specialistEmail = applicationRow?.email && String(applicationRow.email).trim();
    if (specialistEmail) {
      try {
        if (status === 'approved' && specialistRow) {
          const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://freuly.de');
          const claimToken = specialistRow.claim_token;
          const claimUrl = claimToken
            ? `${baseUrl}/specialist/claim?token=${encodeURIComponent(claimToken)}`
            : `${baseUrl}/specialist/dashboard`;
          const profileUrl = `${baseUrl}/ua/specialist/${specialistRow.id}`;
          await sendEmail({
            to: specialistEmail,
            subject: 'Ваша заявка одобрена — доступ к кабинету Freuly',
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2 style="color: #2563eb;">Заявка одобрена</h2>
  <p>Ваша заявка на платформе Freuly одобрена.</p>
  <p><a href="${claimUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Войти в кабинет</a></p>
  <p style="color: #666; font-size: 14px;">Ссылка действует 48 часов. После первого входа она станет недействительной.</p>
  <p><a href="${profileUrl}" style="color: #2563eb;">Открыть профиль</a></p>
</div>`,
          });
        } else if (status === 'rejected') {
          const reason = rejection_reason
            ? String(rejection_reason).trim()
            : 'Причина не указана.';
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
        }
      } catch (emailErr: unknown) {
        console.error('[admin] Email send failed', emailErr);
      }
    }

    try {
      const { error: auditError } = await supabase
        .from('specialist_moderation_log')
        .insert({
          specialist_id: id,
          status,
          reason: status === 'rejected' ? rejection_reason ?? null : null,
          decided_by: 'admin',
          created_at: new Date().toISOString(),
        });
      if (auditError) {
        console.error('[admin] Audit log insert failed', auditError);
      }
    } catch (auditErr: unknown) {
      console.error('[admin] Audit log insert failed', auditErr);
    }

    return NextResponse.json(
      { success: true, updated: data[0] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('[admin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
