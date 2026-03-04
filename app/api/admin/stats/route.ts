import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

export async function GET(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const supabase = createSupabaseServerClient();

    // Total leads count
    const { count: totalLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    if (leadsError) throw leadsError;

    // Leads in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentLeads, error: recentLeadsError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentLeadsError) throw recentLeadsError;

    // Approved specialists count
    const { count: approvedSpecialists, error: approvedError } = await supabase
      .from('specialists')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'published_unverified', 'featured_verified']);

    if (approvedError) throw approvedError;

    // Pending specialists count
    const { count: pendingSpecialists, error: pendingError } = await supabase
      .from('specialists')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    if (pendingError) throw pendingError;

    // Active subscriptions count
    const { count: activeSubscriptions, error: subscriptionsError } = await supabase
      .from('specialists')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active');

    if (subscriptionsError) throw subscriptionsError;

    return NextResponse.json({
      totalLeads: totalLeads || 0,
      recentLeads: recentLeads || 0,
      approvedSpecialists: approvedSpecialists || 0,
      pendingSpecialists: pendingSpecialists || 0,
      activeSubscriptions: activeSubscriptions || 0,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
