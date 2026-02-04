import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

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
    let query = supabase
      .from('specialist_applications')
      .select(cols)
      .eq('status', status);

    if (status === 'pending_review') {
      query = query.not('email_confirmed_at', 'is', null);
    }

    const { data: rows, error } = await query.order('created_at', { ascending: false });

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
        .select('id, title, slug')
        .in('id', categoryIds);
      (cats || []).forEach((c: { id: string; title?: string; slug?: string }) => {
        categoryMap[c.id] = c.title || c.slug || c.id;
      });
    }

    // For approved applications, attach claim_url based on specialists.claim_token
    let claimMap: Record<string, string> = {};
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
          .select('email, claim_token')
          .in('email', emails);

        (specialistsRows || []).forEach((s: { email?: string | null; claim_token?: string | null }) => {
          const email = s.email && String(s.email).trim().toLowerCase();
          if (email && s.claim_token) {
            claimMap[email] = s.claim_token;
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
      const claim_url =
        status === 'approved' && baseUrl && claimToken
          ? `${baseUrl}/specialist/claim?token=${encodeURIComponent(claimToken)}`
          : null;

      return {
        ...row,
        category: row.category_id ? (categoryMap[row.category_id] ?? row.category_id) : null,
        claim_url,
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
