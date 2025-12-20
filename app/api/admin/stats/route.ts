import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminPassword = searchParams.get('admin_password');

  // Validate admin password
  if (adminPassword !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

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
      .eq('status', 'approved');

    if (approvedError) throw approvedError;

    // Pending specialists count
    const { count: pendingSpecialists, error: pendingError } = await supabase
      .from('specialists')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

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
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
