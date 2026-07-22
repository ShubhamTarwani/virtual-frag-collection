import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getFragranceInfo } from '@/lib/cache/fragrance-info';
import { getErrorStatus } from '@/lib/gemini/client';

export async function POST(req: Request) {
  try {
    const { name, brand, isLiquidDeo, skipCacheWrite } = await req.json();

    if (!name || !brand) {
      return NextResponse.json(
        { error: 'Name and Brand are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    // Allow any authenticated user to use the auto-fill feature on their shelf
    // if (adminEmail && user.email !== adminEmail) {
    //   return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    // }

    const autoFillLimit = await checkRateLimit({
      endpoint: 'admin:autofill:hourly',
      identifier: user.id,
      maxRequests: 30,
      windowMinutes: 60
    });

    if (!autoFillLimit.allowed) {
      return NextResponse.json(
        { error: 'Auto-fill limit reached. Wait before fetching more.' },
        { status: 429 }
      );
    }

    // Deliverable 3d: Check master_fragrances first
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: masterMatch } = await supabaseAdmin
      .from('master_fragrances')
      .select('*')
      .ilike('name', name.trim())
      .ilike('house', brand.trim())
      .maybeSingle();

    if (masterMatch) {
      return NextResponse.json({
        category: masterMatch.family || 'Designer',
        occasion: masterMatch.occasion_tags?.[0] || 'Everyday',
        notes: `Top: ${masterMatch.top_notes?.join(', ')}. Heart: ${masterMatch.heart_notes?.join(', ')}. Base: ${masterMatch.base_notes?.join(', ')}`,
        concentration: 'Eau de Parfum',
        rating: 4.5,
        longevity_hours: parseInt(masterMatch.longevity) || 8,
        ideal_season: masterMatch.season_tags?.[0] || 'Fall'
      });
    }

    try {
      const data = await getFragranceInfo(brand, name, undefined, {
        userId: user.id,
        isLiquidDeo,
        skipCacheWrite,
      });
      return NextResponse.json(data);
    } catch (apiErr: unknown) {
      console.error('Gemini API Error:', apiErr);
      return NextResponse.json(
        { error: (apiErr instanceof Error ? apiErr.message : String(apiErr)) || 'Failed to fetch from Gemini API' },
        { status: getErrorStatus(apiErr) }
      );
    }

  } catch (err: unknown) {
    console.error('AutoFill Route Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
