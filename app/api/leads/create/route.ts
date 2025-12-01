import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.from('leads').insert([
      {
        specialist_id,
        client_name,
        client_contact,
        message: message || null,
      },
    ]).select().single();

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ data }, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 400 });
  }
}
