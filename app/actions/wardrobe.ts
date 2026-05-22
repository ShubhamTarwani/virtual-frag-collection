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
import type { AutoContext } from '@/lib/wardrobe/context'
import type { Fragrance, WearLog, UserPicks, ScoredBottle } from '@/lib/wardrobe/scoring'
import type { GeminiOutput } from '@/lib/wardrobe/gemini'

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
})

// ---------------------------------------------------------------------------
// Return type for getRecommendation
// ---------------------------------------------------------------------------

export type RecommendationResult = {
  context: AutoContext
  recommendation: GeminiOutput
  top5: ScoredBottle[]
}

// ---------------------------------------------------------------------------
// Rate limiting (Postgres-backed, no Upstash)
// ---------------------------------------------------------------------------

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const now = new Date()

  const pad = (n: number) => String(n).padStart(2, '0')
  const dayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const hourKey = `${dayKey}-${pad(now.getHours())}`

  // Check hourly (10/hour)
  const { data: hourRow } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action', 'wardrobe_recommend')
    .eq('window_key', hourKey)
    .maybeSingle()

  if (hourRow && hourRow.count >= 10) {
    return { allowed: false, reason: 'Hourly limit reached (10/hour). Try again next hour.' }
  }

  // Check daily (30/day)
  const { data: dayRow } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('action', 'wardrobe_recommend')
    .eq('window_key', dayKey)
    .maybeSingle()

  if (dayRow && dayRow.count >= 30) {
    return { allowed: false, reason: 'Daily limit reached (30/day). Come back tomorrow!' }
  }

  // Increment both windows
  const { error: hourError } = await supabase.from('rate_limits').upsert(
    { user_id: userId, action: 'wardrobe_recommend', window_key: hourKey, count: (hourRow?.count ?? 0) + 1 },
    { onConflict: 'user_id,action,window_key' }
  )
  if (hourError) throw new Error('Rate limit check failed')

  const { error: dayError } = await supabase.from('rate_limits').upsert(
    { user_id: userId, action: 'wardrobe_recommend', window_key: dayKey, count: (dayRow?.count ?? 0) + 1 },
    { onConflict: 'user_id,action,window_key' }
  )
  if (dayError) throw new Error('Rate limit check failed')

  return { allowed: true }
}

// ---------------------------------------------------------------------------
// Main recommendation action
// ---------------------------------------------------------------------------

export async function getRecommendation(
  userPicksRaw: UserPicks,
  latRaw?: number | null,
  lonRaw?: number | null
): Promise<RecommendationResult | { error: string }> {
  try {
    const validated = GetRecommendationSchema.parse({ userPicks: userPicksRaw, lat: latRaw, lon: lonRaw })
    const { userPicks, lat, lon } = validated

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) throw new Error('Unauthorized')

    // 2. Rate limit check
    const rl = await checkRateLimit(user.id)
    if (!rl.allowed) return { error: rl.reason ?? 'Rate limit exceeded.' }

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

  // 4. Fetch last 30 wear_logs for the user
  const { data: logsRaw } = await supabase
    .from('wear_logs')
    .select('id, bottle_id, worn_at, occasion')
    .eq('user_id', user.id)
    .order('worn_at', { ascending: false })
    .limit(30)

  const wearHistory = (logsRaw ?? []) as WearLog[]

  // 5. Detect context
  const context = await buildAutoContext(lat ?? null, lon ?? null)

  // 6. Score collection → top 5
  const allScored = scoreCollection(bottles, context, userPicks, wearHistory)
  const top5 = allScored.slice(0, 5)

  if (top5.length === 0) return { error: 'Not enough bottles to score.' }

  // 7. Gemini re-ranker
  const recommendation = await pickFinalRecommendation(top5, context, userPicks)

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
