import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { specialist_id, client_name, client_contact, message } = body;

    console.log('[leads.create] Received payload:', {
      specialist_id,
      client_name,
      client_contact,
      has_message: !!message,
    });

    if (!specialist_id || typeof specialist_id !== 'string') {
      return Response.json(
        { error: 'specialist_id is required and must be a string' },
        { status: 400 }
      );
    }

    if (!client_name || typeof client_name !== 'string') {
      return Response.json(
        { error: 'client_name is required and must be a string' },
        { status: 400 }
      );
    }

    if (!client_contact || typeof client_contact !== 'string') {
      return Response.json(
        { error: 'client_contact is required and must be a string' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: specialist, error: specialistError } = await supabase
      .from('specialists')
      .select('id')
      .eq('id', specialist_id)
      .maybeSingle();

    if (specialistError) {
      console.error('[leads.create] specialist lookup error', specialistError);
      return Response.json(
        { error: 'Failed to verify specialist' },
        { status: 500 }
      );
    }

    if (!specialist) {
      return Response.json(
        { error: 'Specialist not found' },
        { status: 404 }
      );
    }

    const insertPayload = {
      specialist_id,
      client_name,
      client_contact,
      message: message || null,
    };

    console.log('[leads.create] Insert payload:', insertPayload);

    const { data, error } = await supabase
      .from('leads')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('[leads.create] INSERT ERROR:', error);
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.log('[leads.create] Lead created successfully:', data.id);
    return Response.json({ data }, { status: 200 });
  } catch (err: any) {
    console.error('[leads.create] unexpected error', err);
    return Response.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
