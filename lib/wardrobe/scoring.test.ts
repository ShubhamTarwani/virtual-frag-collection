/**
 * lib/wardrobe/scoring.test.ts
 * Unit tests for the pure scoring engine.
 * Runner: node --import tsx/esm --test (Node 24 built-in test runner)
 * No extra packages needed — tsx is already a dev dependency.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scoreBottle, scoreCollection } from './scoring.ts'
import type { Fragrance, WearLog, UserPicks } from './scoring.ts'
import type { AutoContext } from './context.ts'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BASE_CONTEXT: AutoContext = {
  temp: 25,
  humidity: 50,
  condition: 'sunny',
  timeOfDay: 'morning',
  dayOfWeek: 1,
  season: 'summer',
  lat: 19.076,
  lon: 72.877,
  weatherAvailable: true,
}

function makeBottle(overrides: Partial<Fragrance> = {}): Fragrance {
  return {
    id: 'test-bottle-1',
    name: 'Test Fragrance',
    brand: 'Test Brand',
    image_url: null,
    family: null,
    character: null,
    projection: null,
    longevity: null,
    season_tags: null,
    occasion_tags: null,
    top_notes: null,
    heart_notes: null,
    base_notes: null,
    last_worn_at: null,
    user_rating: null,
    rating: null,
    ideal_season: null,
    occasion: null,
    ...overrides,
  }
}

function wornDaysAgo(bottleId: string, daysAgo: number): WearLog {
  const d = new Date(Date.now() - daysAgo * 86400000)
  return { id: `log-${daysAgo}`, bottle_id: bottleId, worn_at: d.toISOString(), occasion: null }
}

// ---------------------------------------------------------------------------
// Test: Temperature rules
// ---------------------------------------------------------------------------

describe('Temperature rules', () => {
  it('adds +30 for fresh family in hot weather (>30°C)', () => {
    const bottle = makeBottle({ family: 'fresh' })
    const ctx = { ...BASE_CONTEXT, temp: 35 }
    const result = scoreBottle(bottle, ctx, {}, [])
    // Base: rating default 3 * 5 = 15, serendipity -8 to +8, temp +30
    // Minimum guaranteed score from this rule alone should be visible in reasons
    assert.ok(result.reasons.some(r => r.includes('+30') && r.includes('fresh')))
  })

  it('subtracts -20 for oriental family in hot weather (>30°C)', () => {
    const bottle = makeBottle({ family: 'oriental' })
    const ctx = { ...BASE_CONTEXT, temp: 35 }
    const result = scoreBottle(bottle, ctx, {}, [])
    assert.ok(result.reasons.some(r => r.includes('-20') && r.includes('oriental')))
  })

  it('adds +25 for woody family in cold weather (<15°C)', () => {
    const bottle = makeBottle({ family: 'woody' })
    const ctx = { ...BASE_CONTEXT, temp: 10 }
    const result = scoreBottle(bottle, ctx, {}, [])
    assert.ok(result.reasons.some(r => r.includes('+25') && r.includes('woody')))
  })

  it('subtracts -20 for beast projection in high humidity (>75%)', () => {
    const bottle = makeBottle({ projection: 'beast' })
    const ctx = { ...BASE_CONTEXT, humidity: 80 }
    const result = scoreBottle(bottle, ctx, {}, [])
    assert.ok(result.reasons.some(r => r.includes('-20') && r.includes('beast') && r.includes('humidity')))
  })
})

// ---------------------------------------------------------------------------
// Test: Occasion rules
// ---------------------------------------------------------------------------

describe('Occasion rules', () => {
  it('subtracts -40 for beast projection at office', () => {
    const bottle = makeBottle({ projection: 'beast' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { occasion: 'office' }, [])
    assert.ok(result.reasons.some(r => r.includes('-40')))
  })

  it('adds +25 for moderate projection at office', () => {
    const bottle = makeBottle({ projection: 'moderate' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { occasion: 'office' }, [])
    assert.ok(result.reasons.some(r => r.includes('+25') && r.includes('office-safe')))
  })

  it('adds +30 for sensual character on a date', () => {
    const bottle = makeBottle({ character: 'sensual' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { occasion: 'date' }, [])
    assert.ok(result.reasons.some(r => r.includes('+30') && r.includes('date')))
  })

  it('adds +20 for beast projection at night', () => {
    const bottle = makeBottle({ projection: 'beast' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { occasion: 'night' }, [])
    assert.ok(result.reasons.some(r => r.includes('+20') && r.includes('night')))
  })

  it('does NOT apply occasion rules when no occasion selected', () => {
    const bottle = makeBottle({ projection: 'beast' })
    const result = scoreBottle(bottle, BASE_CONTEXT, {}, [])
    // The -40 office penalty should NOT be present
    assert.ok(!result.reasons.some(r => r.includes('-40')))
  })
})

// ---------------------------------------------------------------------------
// Test: Season match
// ---------------------------------------------------------------------------

describe('Season rules', () => {
  it('adds +30 when bottle is tagged for current season', () => {
    const bottle = makeBottle({ season_tags: ['summer', 'post_monsoon'] })
    const ctx = { ...BASE_CONTEXT, season: 'summer' as const }
    const result = scoreBottle(bottle, ctx, {}, [])
    assert.ok(result.reasons.some(r => r.includes('+30') && r.includes('summer')))
  })

  it('falls back to ideal_season field when season_tags is null', () => {
    const bottle = makeBottle({ season_tags: null, ideal_season: 'winter' })
    const ctx = { ...BASE_CONTEXT, season: 'winter' as const }
    const result = scoreBottle(bottle, ctx, {}, [])
    assert.ok(result.reasons.some(r => r.includes('+30') && r.includes('winter')))
  })

  it('does NOT add season bonus for mismatched season', () => {
    const bottle = makeBottle({ season_tags: ['winter'] })
    const ctx = { ...BASE_CONTEXT, season: 'summer' as const }
    const result = scoreBottle(bottle, ctx, {}, [])
    assert.ok(!result.reasons.some(r => r.includes('+30') && r.includes('season')))
  })
})

// ---------------------------------------------------------------------------
// Test: Recency rules
// ---------------------------------------------------------------------------

describe('Recency rules', () => {
  it('subtracts -30 when worn less than 2 days ago', () => {
    const bottle = makeBottle({ id: 'b1' })
    const history: WearLog[] = [wornDaysAgo('b1', 0.5)] // 12 hours ago
    const result = scoreBottle(bottle, BASE_CONTEXT, {}, history)
    assert.ok(result.reasons.some(r => r.includes('-30') && r.includes('too recent')))
  })

  it('adds +10 when not worn in over 14 days', () => {
    const bottle = makeBottle({ id: 'b2' })
    const history: WearLog[] = [wornDaysAgo('b2', 20)]
    const result = scoreBottle(bottle, BASE_CONTEXT, {}, history)
    assert.ok(result.reasons.some(r => r.includes('+10') && r.includes('rotation')))
  })

  it('subtracts -15 when worn 3+ times in last 7 days', () => {
    const bottle = makeBottle({ id: 'b3' })
    const history: WearLog[] = [
      wornDaysAgo('b3', 1),
      wornDaysAgo('b3', 3),
      wornDaysAgo('b3', 5),
    ]
    const result = scoreBottle(bottle, BASE_CONTEXT, {}, history)
    assert.ok(result.reasons.some(r => r.includes('-15') && r.includes('this week')))
  })

  it('does NOT apply recency penalty for different bottle history', () => {
    const bottle = makeBottle({ id: 'b4' })
    const history: WearLog[] = [wornDaysAgo('OTHER-BOTTLE', 0.5)] // someone else's wear
    const result = scoreBottle(bottle, BASE_CONTEXT, {}, history)
    assert.ok(!result.reasons.some(r => r.includes('-30') && r.includes('too recent')))
  })
})

// ---------------------------------------------------------------------------
// Test: User rating
// ---------------------------------------------------------------------------

describe('User rating', () => {
  it('uses user_rating * 5 when set', () => {
    const bottle = makeBottle({ user_rating: 5 })
    const result = scoreBottle(bottle, BASE_CONTEXT, {}, [])
    assert.ok(result.reasons.some(r => r.includes('+25') && r.includes('rated 5/5')))
  })

  it('falls back to rating field if user_rating is null', () => {
    const bottle = makeBottle({ user_rating: null, rating: 4 })
    const result = scoreBottle(bottle, BASE_CONTEXT, {}, [])
    assert.ok(result.reasons.some(r => r.includes('+20') && r.includes('rated 4/5')))
  })

  it('defaults to 3 * 5 = 15 when both rating fields are null', () => {
    const bottle = makeBottle({ user_rating: null, rating: null })
    const result = scoreBottle(bottle, BASE_CONTEXT, {}, [])
    assert.ok(result.reasons.some(r => r.includes('+15') && r.includes('rated 3')))
  })
})

// ---------------------------------------------------------------------------
// Test: Mood rules
// ---------------------------------------------------------------------------

describe('Mood rules', () => {
  it('adds +25 for romantic mood with sensual character', () => {
    const bottle = makeBottle({ character: 'sensual' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { mood: 'romantic' }, [])
    assert.ok(result.reasons.some(r => r.includes('+25') && r.includes('romantic')))
  })

  it('adds +20 for confident mood with beast projection', () => {
    const bottle = makeBottle({ projection: 'beast' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { mood: 'confident' }, [])
    assert.ok(result.reasons.some(r => r.includes('+20') && r.includes('confidence')))
  })

  it('adds +25 for subtle mood with intimate projection', () => {
    const bottle = makeBottle({ projection: 'intimate' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { mood: 'subtle' }, [])
    assert.ok(result.reasons.some(r => r.includes('+25') && r.includes('subtle')))
  })
})

// ---------------------------------------------------------------------------
// Test: Setting & who-with rules
// ---------------------------------------------------------------------------

describe('Setting and who-with rules', () => {
  it('subtracts -30 for beast in small indoor', () => {
    const bottle = makeBottle({ projection: 'beast' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { setting: 'small_indoor' }, [])
    assert.ok(result.reasons.some(r => r.includes('-30') && r.includes('small indoor')))
  })

  it('subtracts -25 for beast around colleagues', () => {
    const bottle = makeBottle({ projection: 'beast' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { whoWith: 'colleagues' }, [])
    assert.ok(result.reasons.some(r => r.includes('-25') && r.includes('colleagues')))
  })
})

// ---------------------------------------------------------------------------
// Test: Longevity guard
// ---------------------------------------------------------------------------

describe('Longevity guard', () => {
  it('subtracts -15 for poor longevity at office', () => {
    const bottle = makeBottle({ longevity: 'poor' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { occasion: 'office' }, [])
    assert.ok(result.reasons.some(r => r.includes('-15') && r.includes('longevity')))
  })

  it('does NOT subtract for poor longevity at casual occasion', () => {
    const bottle = makeBottle({ longevity: 'poor' })
    const result = scoreBottle(bottle, BASE_CONTEXT, { occasion: 'casual' }, [])
    assert.ok(!result.reasons.some(r => r.includes('-15') && r.includes('longevity')))
  })
})

// ---------------------------------------------------------------------------
// Test: Serendipity
// ---------------------------------------------------------------------------

describe('Serendipity', () => {
  it('score always includes a serendipity contribution within -8 to +8', () => {
    const bottle = makeBottle({ user_rating: null, rating: null }) // score = 15 + serendipity only (no other rules)
    // Run 20 times — serendipity should always be in range
    for (let i = 0; i < 20; i++) {
      const result = scoreBottle(bottle, { ...BASE_CONTEXT, temp: null, humidity: null, weatherAvailable: false }, {}, [])
      const serendipityReason = result.reasons.find(r => r.includes('serendipity'))
      if (serendipityReason) {
        const val = parseInt(serendipityReason.replace('+', ''))
        assert.ok(val >= -8 && val <= 8, `Serendipity ${val} out of range`)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Test: scoreCollection ordering
// ---------------------------------------------------------------------------

describe('scoreCollection ordering', () => {
  it('returns bottles sorted by score descending', () => {
    const bottles = [
      makeBottle({ id: 'b1', family: 'oriental', user_rating: 1 }), // will score low
      makeBottle({ id: 'b2', family: 'fresh', user_rating: 5 }),     // will score high
      makeBottle({ id: 'b3', user_rating: 3 }),
    ]
    const ctx = { ...BASE_CONTEXT, temp: 35 } // hot — fresh gets +30, oriental gets -20
    const results = scoreCollection(bottles, ctx, {}, [])
    
    assert.equal(results.length, 3)
    // Each consecutive score should be >= next (sorted descending)
    for (let i = 0; i < results.length - 1; i++) {
      assert.ok(
        results[i].score >= results[i + 1].score,
        `Score at [${i}] (${results[i].score}) should be >= [${i+1}] (${results[i+1].score})`
      )
    }
  })

  it('returns empty array for empty bottles input', () => {
    const results = scoreCollection([], BASE_CONTEXT, {}, [])
    assert.equal(results.length, 0)
  })
})

// ---------------------------------------------------------------------------
// Test: Compound scenario (office beast in heat with colleagues)
// ---------------------------------------------------------------------------

describe('Compound scenario', () => {
  it('heavily penalises beast in office+hot+colleagues+small_indoor context', () => {
    const beast = makeBottle({ projection: 'beast', family: 'oriental', user_rating: 5 })
    const fresh = makeBottle({ id: 'fresh-b', projection: 'moderate', family: 'fresh', user_rating: 3 })
    const ctx = { ...BASE_CONTEXT, temp: 35, humidity: 80 }
    const picks: UserPicks = { occasion: 'office', whoWith: 'colleagues', setting: 'small_indoor' }

    const beastResult = scoreBottle(beast, ctx, picks, [])
    const freshResult = scoreBottle(fresh, ctx, picks, [])

    // Beast should be severely penalised: -40 (office) -20 (humid) -30 (small indoor) -25 (colleagues) = -115 penalty
    assert.ok(
      freshResult.score > beastResult.score,
      `Fresh (${freshResult.score}) should outscore beast (${beastResult.score}) in this context`
    )
    assert.ok(beastResult.reasons.some(r => r.includes('-40')))
    assert.ok(beastResult.reasons.some(r => r.includes('-30')))
    assert.ok(beastResult.reasons.some(r => r.includes('-25')))
  })
})
