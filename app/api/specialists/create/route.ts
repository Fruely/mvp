import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, bio, category_id, languages, hourly_rate, avatar_url } = body;

    // Validate required fields
    if (!name || !email || !category_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, category_id' },
        { status: 400 }
      );
    }

    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return NextResponse.json(
        { error: 'At least one language is required' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    );
    const supabase = supabaseServiceRole;

    // Check if email already exists
    const { data: existingSpecialist, error: checkError } = await supabase
      .from('specialists')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing specialist:', checkError);
      return NextResponse.json(
        { error: 'Database error', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingSpecialist) {
      return NextResponse.json(
        { error: 'Specialist with this email already exists' },
        { status: 409 }
      );
    }

    // Get category UUID from slug
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', category_id)
      .maybeSingle();

    if (categoryError || !categoryData) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Insert specialist with service role client (bypasses RLS)
    const { data: specialist, error: insertError } = await supabase
      .from('specialists')
      .insert({
        name,
        email,
        phone: phone || null,
        bio: bio || null,
        category_id: categoryData.id,
        languages,
        hourly_rate: hourly_rate || null,
        avatar_url: avatar_url || null,
        status: 'pending',
        is_approved: false,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting specialist:', insertError);
      return NextResponse.json(
        { error: 'Failed to create specialist', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, specialist_id: specialist.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Unexpected error in specialists/create:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
