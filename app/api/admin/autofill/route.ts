import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getFragranceInfo } from '@/lib/cache/fragrance-info';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(cookieStore)
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, house } = await req.json();

    if (!name || !house) {
      return NextResponse.json({ error: 'Name and House are required' }, { status: 400 });
    }

    try {
      const data = await getFragranceInfo(house, name, undefined, {
        userId: user.id
      });
      return NextResponse.json(data);
    } catch (apiErr: any) {
      console.error('Gemini API Error:', apiErr);
      return NextResponse.json({ error: apiErr.message || 'Failed to fetch from Gemini API' }, { status: apiErr.status || 500 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
