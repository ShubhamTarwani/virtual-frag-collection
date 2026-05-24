/**
 * lib/wardrobe/scoring.ts — Pure pre-scoring engine, zero I/O.
 */
import type { AutoContext } from './context'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Fragrance = {
  id: string
  name: string | null
  brand: string | null
  image_url: string | null
  family: string | null
  character: string | null
  projection: string | null
  longevity: string | null
  season_tags: string[] | null
  occasion_tags: string[] | null
  top_notes: string[] | null
  heart_notes: string[] | null
  base_notes: string[] | null
  last_worn_at: string | null
  user_rating: number | null
  rating: number | null
  ideal_season: string | null
  occasion: string | null
}

export type WearLog = {
  id: string
  bottle_id: string
  worn_at: string
  occasion: string | null
}

export type UserPicks = {
  occasion?: string
  whoWith?: string
  setting?: string
  mood?: string
}

export type ScoredBottle = {
  bottle: Fragrance
  score: number
  reasons: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function has(value: string | null | undefined, arr: string[]): boolean {
  return value ? arr.includes(value) : false
}

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86400000
}

// ---------------------------------------------------------------------------
// Core scoring — PURE
// ---------------------------------------------------------------------------

export function scoreBottle(
  bottle: Fragrance,
  context: AutoContext,
  userPicks: UserPicks,
  wearHistory: WearLog[]
): ScoredBottle {
  let score = 0
  const reasons: string[] = []
  const { temp, humidity, season, timeOfDay } = context
  const fam = bottle.family?.toLowerCase() ?? null
  const char = bottle.character?.toLowerCase() ?? null
  const proj = bottle.projection?.toLowerCase() ?? null
  const lon = bottle.longevity?.toLowerCase() ?? null

  // TEMPERATURE
  if (temp !== null) {
    if (temp > 30 && has(fam, ['fresh', 'citrus', 'aquatic'])) {
      score += 30; reasons.push(`+30: ${fam} thrives in ${temp}°C heat`)
    }
    if (temp > 30 && has(fam, ['oriental', 'gourmand'])) {
      score -= 20; reasons.push(`-20: ${fam} overpowers in ${temp}°C heat`)
    }
    if (temp < 15 && has(fam, ['woody', 'oriental'])) {
      score += 25; reasons.push(`+25: ${fam} shines in cool ${temp}°C`)
    }
  }
  if (humidity !== null && humidity > 75 && proj === 'beast') {
    score -= 20; reasons.push(`-20: beast projection amplified in ${humidity}% humidity`)
  }

  // OCCASION
  if (userPicks.occasion) {
    const occ = userPicks.occasion
    if (occ === 'office' && proj === 'beast')      { score -= 40; reasons.push(`-40: beast too aggressive for office`) }
    if (occ === 'office' && proj === 'moderate')   { score += 25; reasons.push(`+25: moderate projection is office-safe`) }
    if (occ === 'date' && char === 'sensual')      { score += 30; reasons.push(`+30: sensual is magnetic on a date`) }
    if (occ === 'night' && proj === 'beast')       { score += 20; reasons.push(`+20: beast owns the night`) }
    if (occ === 'outdoor' && fam === 'fresh')      { score += 25; reasons.push(`+25: fresh family is perfect outdoors`) }
    if (occ === 'formal' && has(char, ['serious', 'dark'])) { score += 20; reasons.push(`+20: ${char} suits formal occasions`) }
    if (occ === 'casual' && char === 'playful')    { score += 20; reasons.push(`+20: playful character fits casual`) }
  }

  // TIME OF DAY
  if (timeOfDay === 'night' && has(fam, ['oriental', 'woody']))         { score += 20; reasons.push(`+20: ${fam} comes alive at night`) }
  if (timeOfDay === 'morning' && has(fam, ['fresh', 'citrus']))         { score += 20; reasons.push(`+20: ${fam} is a great morning opener`) }
  if (timeOfDay === 'morning' && fam === 'oriental')                    { score -= 15; reasons.push(`-15: oriental feels heavy in the morning`) }
  if (timeOfDay === 'evening' && has(fam, ['oriental', 'woody', 'gourmand'])) { score += 15; reasons.push(`+15: ${fam} shines in the evening`) }

  // SEASON MATCH
  const seasonTags = bottle.season_tags ?? (bottle.ideal_season ? [bottle.ideal_season] : [])
  if (seasonTags.includes(season)) { score += 30; reasons.push(`+30: tagged for ${season}`) }

  // OCCASION TAG MATCH
  const occTags = bottle.occasion_tags ?? (bottle.occasion ? [bottle.occasion] : [])
  if (userPicks.occasion && occTags.includes(userPicks.occasion)) { score += 25; reasons.push(`+25: tagged for ${userPicks.occasion}`) }

  // MOOD
  if (userPicks.mood) {
    const mood = userPicks.mood
    if (mood === 'energised' && has(fam, ['fresh', 'citrus']))    { score += 20; reasons.push(`+20: ${fam} matches energised mood`) }
    if (mood === 'romantic' && char === 'sensual')                { score += 25; reasons.push(`+25: sensual feeds romantic energy`) }
    if (mood === 'confident' && proj === 'beast')                 { score += 20; reasons.push(`+20: beast amplifies confidence`) }
    if (mood === 'subtle' && proj === 'intimate')                  { score += 25; reasons.push(`+25: intimate projection fits subtle mood`) }
    if (mood === 'relaxed' && has(char, ['clean', 'fresh']))      { score += 20; reasons.push(`+20: ${char} character is calming`) }
  }

  // SETTING
  if (userPicks.setting) {
    if (userPicks.setting === 'small_indoor' && proj === 'beast')  { score -= 30; reasons.push(`-30: beast overwhelms small indoor spaces`) }
    if (userPicks.setting === 'outdoor' && proj === 'intimate')    { score -= 15; reasons.push(`-15: intimate projection disappears outdoors`) }
  }

  // WHO WITH
  if (userPicks.whoWith) {
    if (userPicks.whoWith === 'colleagues' && proj === 'beast')    { score -= 25; reasons.push(`-25: beast too imposing around colleagues`) }
    if (userPicks.whoWith === 'partner' && char === 'sensual')     { score += 20; reasons.push(`+20: sensual works beautifully with a partner`) }
  }

  // RECENCY
  const wears = wearHistory.filter(w => w.bottle_id === bottle.id)
  if (wears.length > 0) {
    const mostRecent = wears.reduce((a, b) => a.worn_at > b.worn_at ? a : b)
    const days = daysAgo(mostRecent.worn_at)
    if (days < 2)  { score -= 30; reasons.push(`-30: worn ${days.toFixed(1)}d ago — too recent`) }
    else if (days > 14) { score += 10; reasons.push(`+10: not worn in ${Math.floor(days)} days — deserves rotation`) }
  }
  const last7 = wears.filter(w => daysAgo(w.worn_at) <= 7)
  if (last7.length >= 3) { score -= 15; reasons.push(`-15: worn ${last7.length}x this week — variety time`) }

  // USER RATING
  const rating = bottle.user_rating ?? bottle.rating ?? 3
  const ratingPts = (rating as number) * 5
  score += ratingPts
  reasons.push(`+${ratingPts}: rated ${rating}/5`)

  // SERENDIPITY
  const rand = Math.floor(Math.random() * 17) - 8
  score += rand
  if (rand !== 0) reasons.push(`${rand > 0 ? '+' : ''}${rand}: serendipity`)

  // LONGEVITY GUARD
  if (lon === 'poor' && has(userPicks.occasion, ['office', 'formal'])) {
    score -= 15; reasons.push(`-15: poor longevity won't last through ${userPicks.occasion}`)
  }

  return { bottle, score, reasons }
}

export function scoreCollection(
  bottles: Fragrance[],
  context: AutoContext,
  userPicks: UserPicks,
  wearHistory: WearLog[]
): ScoredBottle[] {
  return bottles
    .map(b => scoreBottle(b, context, userPicks, wearHistory))
    .sort((a, b) => b.score - a.score)
}
