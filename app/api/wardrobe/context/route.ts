/**
 * app/api/wardrobe/context/route.ts
 * POST { lat, lon } → AutoContext (auth-gated, 5s OWM timeout)
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { buildAutoContext } from '@/lib/wardrobe/context'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate Limiting: Max 20 calls per user per hour
    const limit = await checkRateLimit({
      endpoint: 'weather_context',
      identifier: user.id,
      maxRequests: 20,
      windowMinutes: 60
    })

    if (!limit.allowed) {
      return rateLimitResponse(limit)
    }

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
