'use server'

/**
 * app/actions/wardrobe.ts
 * Server actions: getRecommendation + logWear
 */
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { buildAutoContext } from '@/lib/wardrobe/context'
import { scoreCollection } from '@/lib/wardrobe/scoring'
import { pickFinalRecommendation } from '@/lib/wardrobe/gemini'
import { bucketTemperature, bucketHumidity, generateCollectionFingerprint, hashContext } from '@/lib/cache/context-hash'
import type { WardrobeContext } from '@/lib/cache/context-hash'
import type { AutoContext } from '@/lib/wardrobe/context'
import type { Fragrance, WearLog, UserPicks, ScoredBottle } from '@/lib/wardrobe/scoring'
import type { GeminiOutput } from '@/lib/wardrobe/gemini'
import { checkRateLimit } from '@/lib/ratelimit'

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const WearLogSchema = z.object({
  bottleId: z.string().uuid(),
  occasion: z.enum(['office','casual','date','formal','outdoor','night']).optional().nullable(),
  mood: z.enum(['energised','relaxed','confident','romantic','subtle']).optional().nullable(),
  setting: z.enum(['small_indoor','large_indoor','outdoor','commute']).optional().nullable(),
  whoWith: z.enum(['solo','friends','colleagues','partner','family']).optional().nullable(),
  weatherTemp: z.number().nullable().optional(),
  weatherHumidity: z.number().nullable().optional(),
  weatherCondition: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  timeOfDay: z.string().nullable().optional(),
  source: z.enum(['manual', 'wardrobe_ai']).optional(),
})

const GetRecommendationSchema = z.object({
  userPicks: z.object({
    occasion: z.enum(['office','casual','date','formal','outdoor','night']).optional(),
    mood: z.enum(['energised','relaxed','confident','romantic','subtle']).optional(),
    setting: z.enum(['small_indoor','large_indoor','outdoor','commute']).optional(),
    whoWith: z.enum(['solo','friends','colleagues','partner','family']).optional(),
  }),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  forceRefresh: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Return type for getRecommendation
// ---------------------------------------------------------------------------

export type RecommendationResult = {
  context: AutoContext
  recommendation: GeminiOutput
  top5: ScoredBottle[]
}

// Rate limiting logic has been moved to lib/rate-limit.ts
// ---------------------------------------------------------------------------
// Main recommendation action
// ---------------------------------------------------------------------------

export async function getRecommendation(
  userPicksRaw: UserPicks,
  latRaw?: number | null,
  lonRaw?: number | null,
  forceRefresh?: boolean
): Promise<RecommendationResult | { error: string; rateLimit?: boolean; resetAt?: string }> {
  try {
    const validated = GetRecommendationSchema.parse({ userPicks: userPicksRaw, lat: latRaw, lon: lonRaw, forceRefresh })
    const { userPicks, lat, lon } = validated
    const doForceRefresh = validated.forceRefresh ?? false

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) throw new Error('Unauthorized')

    // 2. Rate limit check
    const hourly = await checkRateLimit({
      userId: user.id,
      bucket: 'wardrobe_rec',
      limit: 20,
      windowSeconds: 3600
    })
    if (!hourly.allowed) {
      return { 
        error: 'You\'ve reached the recommendation limit for this hour. You can try again at [time]. In the meantime, browse your collection or check your wear history.',
        rateLimit: true,
        resetAt: hourly.resetAt.toISOString()
      }
    }

    // 3. Fetch user's bottles
    const { data: bottlesRaw, error: bottlesError } = await supabase
      .from('perfumes')
      .select('id, name, brand, image_url, family, character, projection, longevity, season_tags, occasion_tags, top_notes, heart_notes, base_notes, last_worn_at, user_rating, rating, ideal_season, occasion')
      .eq('user_id', user.id)

    if (bottlesError) return { error: 'Failed to fetch your collection.' }
    const bottles = (bottlesRaw ?? []) as Fragrance[]

    if (bottles.length === 0) {
      return { error: 'Add a few bottles to unlock your wardrobe assistant.' }
    }

    // 4. Detect context and hash it for caching
    const context = await buildAutoContext(lat ?? null, lon ?? null)
    
    const wardrobeCtx: WardrobeContext = {
      temp_bucket: bucketTemperature(context.weatherAvailable ? context.temp : null),
      humidity_bucket: bucketHumidity(context.weatherAvailable ? context.humidity : null),
      condition: context.weatherAvailable ? context.condition : 'unknown',
      time_of_day: context.timeOfDay,
      season: context.season,
      occasion: userPicks.occasion,
      mood: userPicks.mood,
      setting: userPicks.setting,
      who_with: userPicks.whoWith,
      collection_fingerprint: generateCollectionFingerprint(bottles.map(b => b.id))
    }
    const ctxHash = hashContext(wardrobeCtx)

    // 5. Check cache Layer 2
    if (!doForceRefresh) {
      const { data: cached } = await supabase
        .from('wardrobe_recommendations_cache')
        .select('*')
        .eq('user_id', user.id)
        .eq('context_hash', ctxHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

      if (cached) {
        // Verify bottle_ids still exist (in case of a deletion without trigger, though trigger is there)
        const userBottleIds = new Set(bottles.map(b => b.id))
        const isValid = cached.bottle_ids.every((id: string) => userBottleIds.has(id))
        if (isValid) {
          // Log cache hit
          const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
          await supabaseAdmin.from('gemini_api_log').insert({
            user_id: user.id,
            flow: 'wardrobe_rec',
            cache_hit: true,
            latency_ms: 0
          })

          // We need top5 from scoring to return, so compute it anyway (it's fast without Gemini call)
          const { data: logsRaw } = await supabase.from('wear_logs').select('id, bottle_id, worn_at, occasion').eq('user_id', user.id).order('worn_at', { ascending: false }).limit(30)
          const allScored = scoreCollection(bottles, context, userPicks, (logsRaw ?? []) as WearLog[])
          const top5 = allScored.slice(0, 5)

          return { context, recommendation: cached.result as GeminiOutput, top5 }
        }
      }
    }

    // 6. Fetch wear history and Score collection
    const { data: logsRaw } = await supabase
      .from('wear_logs')
      .select('id, bottle_id, worn_at, occasion')
      .eq('user_id', user.id)
      .order('worn_at', { ascending: false })
      .limit(30)

    const wearHistory = (logsRaw ?? []) as WearLog[]
    const allScored = scoreCollection(bottles, context, userPicks, wearHistory)
    const top5 = allScored.slice(0, 5)

    if (top5.length === 0) return { error: 'Not enough bottles to score.' }

    // 7. Gemini re-ranker
    const recommendation = await pickFinalRecommendation(top5, context, userPicks)

    // 8. Upsert cache
    const mentionedIds = [recommendation.primary.bottle_id, ...recommendation.alternatives.map(a => a.bottle_id)]
    if (recommendation.avoid_today?.bottle_id) {
      mentionedIds.push(recommendation.avoid_today.bottle_id)
    }

    await supabase.from('wardrobe_recommendations_cache').upsert({
      user_id: user.id,
      context_hash: ctxHash,
      result: recommendation,
      bottle_ids: Array.from(new Set(mentionedIds)),
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
    }, { onConflict: 'user_id, context_hash' })

    return { context, recommendation, top5 }
  } catch (e) {
    console.error('[getRecommendation]', e)
    return { error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Log a wear entry
// ---------------------------------------------------------------------------

export type LogWearInput = {
  bottleId: string
  occasion?: string
  whoWith?: string
  setting?: string
  mood?: string
  weatherTemp?: number | null
  weatherHumidity?: number | null
  weatherCondition?: string | null
  season?: string
  timeOfDay?: string
  source?: 'manual' | 'wardrobe_ai'
}

export async function logWear(inputRaw: LogWearInput): Promise<{ success: boolean; error?: string }> {
  try {
    const input = WearLogSchema.parse(inputRaw)
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) throw new Error('Unauthorized')

    const { error } = await supabase.from('wear_logs').insert({
      user_id: user.id,
      bottle_id: input.bottleId,
      worn_at: new Date().toISOString(),
      occasion: input.occasion ?? null,
      who_with: input.whoWith ?? null,
      setting: input.setting ?? null,
      mood: input.mood ?? null,
      weather_temp: input.weatherTemp ?? null,
      weather_humidity: input.weatherHumidity ?? null,
      weather_condition: input.weatherCondition ?? null,
      season: input.season ?? null,
      time_of_day: input.timeOfDay ?? null,
      source: input.source ?? 'wardrobe_ai',
    })

    if (error) {
      console.error('[logWear db error]', error)
      return { success: false, error: 'Failed to log wear. Please try again.' }
    }
    return { success: true }
  } catch (e) {
    console.error('[logWear]', e)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}

// ---------------------------------------------------------------------------
// Fetch wear history for history page
// ---------------------------------------------------------------------------

export async function getWearHistory(limit = 100) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) throw new Error('Unauthorized')

  const { data } = await supabase
    .from('wear_logs')
    .select(`
      id, worn_at, occasion, who_with, setting, mood,
      weather_temp, weather_humidity, weather_condition, season, time_of_day, source,
      perfumes (id, name, brand, image_url)
    `)
    .eq('user_id', user.id)
    .order('worn_at', { ascending: false })
    .limit(limit)

    return data ?? []
  } catch (e) {
    console.error('[getWearHistory]', e)
    return []
  }
}

// ---------------------------------------------------------------------------
// Fetch wear insights
// ---------------------------------------------------------------------------

export async function getWearInsights() {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) throw new Error('Unauthorized')

  // Most worn this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: monthLogs } = await supabase
    .from('wear_logs')
    .select('bottle_id, perfumes(id, name, brand, image_url)')
    .eq('user_id', user.id)
    .gte('worn_at', monthStart)

  // Count per bottle
  const counts: Record<string, { count: number; bottle: { id: string; name: string | null; brand: string | null; image_url: string | null } }> = {}
  for (const log of monthLogs ?? []) {
    const id = log.bottle_id
    if (!counts[id]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      counts[id] = { count: 0, bottle: (log as any).perfumes }
    }
    counts[id].count++
  }
  const mostWorn = Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // All user bottles
  const { data: allBottles } = await supabase
    .from('perfumes')
    .select('id, name, brand, image_url, created_at')
    .eq('user_id', user.id)

  // Unsung: owned > 30 days, worn 0 times this month
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const wornIds = new Set((monthLogs ?? []).map(l => l.bottle_id))
  const unsung = (allBottles ?? [])
    .filter(b => b.created_at < thirtyDaysAgo && !wornIds.has(b.id))
    .slice(0, 5)

  // Patterns by occasion
  const { data: occasionLogs } = await supabase
    .from('wear_logs')
    .select('occasion, bottle_id, perfumes(id, name, brand)')
    .eq('user_id', user.id)
    .not('occasion', 'is', null)

  const occasionMap: Record<string, Record<string, number>> = {}
  for (const log of occasionLogs ?? []) {
    const occ = log.occasion ?? 'unknown'
    if (!occasionMap[occ]) occasionMap[occ] = {}
    occasionMap[occ][log.bottle_id] = (occasionMap[occ][log.bottle_id] ?? 0) + 1
  }
  const patterns: Array<{ occasion: string; topBottleId: string }> = Object.entries(occasionMap)
    .map(([occ, bottleCount]) => {
      const topId = Object.entries(bottleCount).sort((a, b) => b[1] - a[1])[0]?.[0]
      return { occasion: occ, topBottleId: topId }
    })
    .filter(p => p.topBottleId)

  // Streak: consecutive days logged
  const { data: allLogs } = await supabase
    .from('wear_logs')
    .select('worn_at')
    .eq('user_id', user.id)
    .order('worn_at', { ascending: false })

  let streak = 0
  if (allLogs && allLogs.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const logDates = [...new Set((allLogs).map(l => {
      const d = new Date(l.worn_at)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }))].sort((a, b) => b - a)

    let expected = today.getTime()
    for (const ts of logDates) {
      if (ts === expected) {
        streak++
        expected -= 86400000
      } else {
        break
      }
    }
  }

  return { mostWorn, unsung, patterns, streak }
  } catch (e) {
    console.error('[getWearInsights]', e)
    return null
  }
}
