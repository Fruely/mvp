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

    const { data: current } = await supabase
      .from('specialists')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json(
        { error: 'Specialist not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const currentStatus = (current as { status?: string }).status;
    if (currentStatus === status) {
      return NextResponse.json(
        { success: true, updated: current },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const updateData: Record<string, any> = {
      status,
      is_approved: status === 'approved',
    };

    if (status === 'approved') {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const claimToken = crypto.randomUUID();
      updateData.approved_at = now.toISOString();
      updateData.is_visible = true;
      updateData.claim_token = claimToken;
      updateData.claim_token_created_at = now.toISOString();
      updateData.claim_token_expires_at = expiresAt.toISOString();
      updateData.claim_token_used_at = null;
    } else if (status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      if (rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }
    }

    const { error, data } = await supabase
      .from('specialists')
      .update(updateData)
      .eq('id', id)
      .select();

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

    const specialistRow = data[0] as {
      id?: string;
      email?: string | null;
      claim_token?: string | null;
    };
    const specialistEmail = specialistRow?.email && String(specialistRow.email).trim();
    if (specialistEmail) {
      try {
        if (status === 'approved') {
          const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.VERCEL_URL ||
            (request.url ? new URL(request.url).origin : 'https://freuly.de');
          const claimToken = specialistRow?.claim_token;
          const claimUrl = claimToken
            ? `${baseUrl}/specialist/claim?token=${encodeURIComponent(claimToken)}`
            : `${baseUrl}/specialist/dashboard`;
          const profileUrl = `${baseUrl}/ua/specialist/${id}`;
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
            : 'No reason provided.';
          await sendEmail({
            to: specialistEmail,
            subject: 'Your profile was not approved',
            html: `Your specialist profile was not approved.<br><br>Rejection reason:<br>${reason}`,
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
