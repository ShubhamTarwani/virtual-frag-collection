import { createClient } from '@supabase/supabase-js'

export type RateLimitConfig = {
  userId: string
  bucket: 'fragrance_info' | 'wardrobe_rec' | 'bulk_import'
  limit: number
  windowSeconds: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: Date
}

// Ensure it's safe to run in edge/server by using pure standard fetch clients
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function checkRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { userId, bucket, limit, windowSeconds } = config

  try {
    const { data: row } = await supabaseAdmin
      .from('rate_limit_buckets')
      .select('*')
      .eq('user_id', userId)
      .eq('bucket', bucket)
      .maybeSingle()

    const now = new Date()
    const windowMs = windowSeconds * 1000

    if (!row) {
      const resetAt = new Date(now.getTime() + windowMs)
      await supabaseAdmin.from('rate_limit_buckets').insert({
        user_id: userId,
        bucket,
        window_start: now.toISOString(),
        count: 1,
      })

      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
      }
    }

    const windowStart = new Date(row.window_start)
    const windowExpired = now.getTime() - windowStart.getTime() > windowMs

    if (windowExpired) {
      const resetAt = new Date(now.getTime() + windowMs)
      await supabaseAdmin
        .from('rate_limit_buckets')
        .update({
          window_start: now.toISOString(),
          count: 1,
        })
        .eq('id', row.id)

      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
      }
    }

    const resetAt = new Date(windowStart.getTime() + windowMs)

    if (row.count < limit) {
      await supabaseAdmin
        .from('rate_limit_buckets')
        .update({
          count: row.count + 1,
        })
        .eq('id', row.id)

      return {
        allowed: true,
        remaining: limit - row.count - 1,
        resetAt,
      }
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    }

  } catch (error) {
    console.error(`Rate limit check failed for ${bucket}:`, error)
    // Fail open if database is down or something unexpected happens
    return {
      allowed: true,
      remaining: 1,
      resetAt: new Date(Date.now() + 60000),
    }
  }
}
