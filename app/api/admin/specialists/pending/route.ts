import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

const DEFAULT_CATEGORY_LABEL = 'Категория';

export async function GET(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const status =
      statusParam === 'approved' || statusParam === 'rejected'
        ? statusParam
        : 'pending_review';

    const supabase = createSupabaseServerClient();

    const cols = 'id, email, name, phone, category_id, stoir_number, about_short, proof_link, created_at, status, rejection_reason, rejected_at';

    let rows: Array<Record<string, unknown>> = [];
    let error: { message?: string } | null = null;

    if (status === 'approved') {
      // Admin approved list must come directly from specialists and include all rows.
      const result = await supabase
        .from('specialists')
        .select('*')
        .order('created_at', { ascending: false });
      rows = (result.data ?? []) as Array<Record<string, unknown>>;
      error = result.error as { message?: string } | null;
    } else {
      let query = supabase.from('specialist_applications').select(cols);
      if (status === 'pending_review') {
        query = query.in('status', ['pending_review']);
        query = query.not('email_confirmed_at', 'is', null);
      } else {
        query = query.eq('status', status);
      }
      const result = await query.order('created_at', { ascending: false });
      rows = (result.data ?? []) as Array<Record<string, unknown>>;
      error = result.error as { message?: string } | null;
    }

    if (error) {
      console.error('[admin] Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const rowsArray = rows || [];

    // Map categories
    const categoryIds = Array.from(
      new Set(rowsArray.map((r: { category_id?: string | null }) => r.category_id).filter(Boolean))
    ) as string[];
    let categoryMap: Record<string, string> = {};
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from('categories')
        .select('id, title, title_ru, title_de, title_ua, slug')
        .in('id', categoryIds);
      (cats || []).forEach((c: { id: string; title?: string; title_ru?: string; title_de?: string; title_ua?: string; slug?: string }) => {
        categoryMap[c.id] = c.title || DEFAULT_CATEGORY_LABEL;
      });
    }

    // For approved applications, attach claim_url and claim_token_used_at based on specialists
    let claimMap: Record<string, string> = {};
    let claimUsedMap: Record<string, string | null> = {};
    let specialistIdMap: Record<string, string> = {};
    let specialistActiveMap: Record<string, boolean | null> = {};
    if (status === 'approved' && rowsArray.length > 0) {
      const emails = Array.from(
        new Set(
          rowsArray
            .map((r: { email?: string | null }) => (typeof r.email === 'string' ? r.email.trim().toLowerCase() : null))
            .filter(Boolean)
        )
      ) as string[];

      if (emails.length > 0) {
        const { data: specialistsRows } = await supabase
          .from('specialists')
          .select('id, email, claim_token, claim_token_used_at, is_active')
          .in('email', emails);

        (specialistsRows || []).forEach((s: { id: string; email?: string | null; claim_token?: string | null; claim_token_used_at?: string | null; is_active?: boolean | null }) => {
          const email = s.email && String(s.email).trim().toLowerCase();
          if (email) {
            if (s.claim_token) {
              claimMap[email] = s.claim_token;
            }
            claimUsedMap[email] = s.claim_token_used_at || null;
            specialistIdMap[email] = s.id;
            specialistActiveMap[email] = typeof s.is_active === 'boolean' ? s.is_active : null;
          }
        });
      }
    }

    let baseUrl: string | null = null;
    if (status === 'approved') {
      const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
      const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
      baseUrl = (envUrl && envUrl.replace(/\/$/, '')) || vercelUrl || 'https://freuly.de';
    }

    const data = rowsArray.map((row: { category_id?: string | null; email?: string | null; [k: string]: unknown }) => {
      const email = row.email && String(row.email).trim().toLowerCase();
      const claimToken = email ? claimMap[email] : undefined;
      const specialist_id = email ? specialistIdMap[email] ?? null : null;
      const is_active = email ? specialistActiveMap[email] ?? null : null;
      const claim_url =
        status === 'approved' && baseUrl && claimToken
          ? `${baseUrl}/specialist/claim?token=${encodeURIComponent(claimToken)}`
          : null;
      const claim_token_used_at = status === 'approved' && email ? claimUsedMap[email] : null;

      const isSpecialistRow = status === 'approved';
      return {
        ...row,
        category: row.category_id ? (categoryMap[row.category_id] ?? DEFAULT_CATEGORY_LABEL) : null,
        specialist_id: isSpecialistRow ? (typeof row.id === 'string' ? row.id : specialist_id) : specialist_id,
        is_active: isSpecialistRow
          ? (typeof row.is_active === 'boolean' ? row.is_active : is_active)
          : is_active,
        claim_url,
        claim_token_used_at,
        source: isSpecialistRow ? 'specialist' : 'application',
        can_resend_claim: !isSpecialistRow,
      };
    });

    return NextResponse.json(
      { data },
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
