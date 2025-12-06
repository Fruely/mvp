import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // Read raw body for better debugging (some clients may send malformed JSON)
    const raw = await request.text();
    // Log raw body so server logs show what was received
    // eslint-disable-next-line no-console
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
    return Response.json({ error: err.message || 'Unknown error' }, { status: 400 });
  }
}
