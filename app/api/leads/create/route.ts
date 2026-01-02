import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    console.log('[leads.create] raw body:', raw);

    let body: any;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch (parseErr: any) {
      return Response.json(
        { error: 'Invalid JSON', details: parseErr.message, raw },
        { status: 400 }
      );
    }

    const { specialist_id, client_name, client_contact, message } = body;

    if (
      !specialist_id ||
      typeof specialist_id !== 'string' ||
      !client_name ||
      typeof client_name !== 'string' ||
      !client_contact ||
      typeof client_contact !== 'string'
    ) {
      return Response.json(
        { error: 'Missing or invalid required fields', received: { specialist_id, client_name, client_contact } },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Optionally verify specialist exists (helps avoid FK errors and returns friendly message)
    const { data: specialistExists, error: specialistError } = await supabase
      .from('specialists')
      .select('id')
      .eq('id', specialist_id)
      .maybeSingle();

    if (specialistError) {
      console.error('[leads.create] specialist lookup error', specialistError);
      return Response.json({ error: 'Failed to verify specialist' }, { status: 500 });
    }

    if (!specialistExists) {
      return Response.json({ error: 'Specialist not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          specialist_id,
          client_name,
          client_contact,
          message: message || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error('[leads.create] unexpected error', err);
    return Response.json({ error: err.message || 'Unknown error' }, { status: 400 });
  }
}
