import { createClient } from '@supabase/supabase-js'

export type RateLimitConfig = {
  endpoint: string
  maxRequests: number
  windowMinutes: number
  identifier: string    // user_id if authenticated, IP if not
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
}

// Ensure it's safe to run in edge (e.g. middleware) by using pure standard fetch clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Bypass RLS using service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

export async function checkRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { endpoint, maxRequests, windowMinutes, identifier } = config

  try {
    // 1. Query rate_limits for existing row
    const { data: row } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .maybeSingle()

    const now = new Date()
    const windowMs = windowMinutes * 60 * 1000

    // 2. No row exists
    if (!row) {
      const resetAt = new Date(now.getTime() + windowMs)
      await supabaseAdmin.from('rate_limits').insert({
        identifier,
        endpoint,
        window_start: now.toISOString(),
        call_count: 1,
      })

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt,
      }
    }

    const windowStart = new Date(row.window_start)
    const windowExpired = now.getTime() - windowStart.getTime() > windowMs

    // 3. Row exists, but window expired
    if (windowExpired) {
      const resetAt = new Date(now.getTime() + windowMs)
      await supabaseAdmin
        .from('rate_limits')
        .update({
          window_start: now.toISOString(),
          call_count: 1,
        })
        .eq('id', row.id)

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt,
      }
    }

    // Window is active
    const resetAt = new Date(windowStart.getTime() + windowMs)

    // 4. Row exists, active, within limits
    if (row.call_count < maxRequests) {
      await supabaseAdmin
        .from('rate_limits')
        .update({
          call_count: row.call_count + 1,
        })
        .eq('id', row.id)

      return {
        allowed: true,
        remaining: maxRequests - row.call_count - 1,
        resetAt,
      }
    }

    // 5. Row exists, active, exceeded limit
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    }

  } catch (error) {
    console.error(`Rate limit check failed for ${endpoint}:`, error)
    // Fail open if database is down or something unexpected happens
    return {
      allowed: true,
      remaining: 1,
      resetAt: new Date(Date.now() + 60000),
    }
  }
}

export function rateLimitResponse(result: RateLimitResult) {
  return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil(
        (result.resetAt.getTime() - Date.now()) / 1000
      ).toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
    },
  })
}
