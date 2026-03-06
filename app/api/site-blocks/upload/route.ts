export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminToken } from '@/lib/adminApiAuth';

export async function POST(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase env is not configured' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Недопустимый тип файла' }, { status: 400 });
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Файл слишком большой' }, { status: 400 });
    }
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
    const { data, error } = await supabase.storage.from('site-blocks').upload(fileName, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (error) {
      console.error('[site-blocks upload] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data: urlData } = supabase.storage.from('site-blocks').getPublicUrl(data.path);
    return NextResponse.json({ success: true, url: urlData.publicUrl, fileName });
  } catch (error: any) {
    console.error('[site-blocks upload] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
