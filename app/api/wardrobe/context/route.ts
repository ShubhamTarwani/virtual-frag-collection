/**
 * app/api/wardrobe/context/route.ts
 * POST { lat, lon } → AutoContext (auth-gated, 5s OWM timeout)
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { buildAutoContext } from '@/lib/wardrobe/context'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate Limiting: Max 20 calls per user per hour
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const hourKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}`
    
    const { data: rlData } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('user_id', user.id)
      .eq('action', 'weather_context')
      .eq('window_key', hourKey)
      .maybeSingle()

    if (rlData && rlData.count >= 20) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    await supabase.from('rate_limits').upsert(
      { user_id: user.id, action: 'weather_context', window_key: hourKey, count: (rlData?.count ?? 0) + 1 },
      { onConflict: 'user_id,action,window_key' }
    )

    let lat: number | null = null
    let lon: number | null = null

    try {
      const body = await req.json()
      lat = typeof body.lat === 'number' ? body.lat : null
      lon = typeof body.lon === 'number' ? body.lon : null
    } catch {
      // Missing body is fine — returns season+time only
    }

    const context = await buildAutoContext(lat, lon)

    return NextResponse.json(context, {
      headers: {
        'Cache-Control': 'private, max-age=600',
      },
    })
  } catch (err) {
    console.error('[context API error]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
