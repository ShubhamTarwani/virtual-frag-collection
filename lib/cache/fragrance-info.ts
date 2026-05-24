import { Schema, SchemaType } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'
import { canonicalSlug } from './slug'
import { callGemini } from '../gemini/client'

export type CachedInfo = {
  category: string
  occasion: string
  notes: string
  concentration: string
  rating: number
  longevity_hours: number
  ideal_season: string
  family?: string
  character?: string
  projection?: string
  longevity?: string
  season_tags?: string[]
  occasion_tags?: string[]
  top_notes?: string[]
  heart_notes?: string[]
  base_notes?: string[]
  description?: string
  release_year?: number | null
}

const fragranceInfoSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    category: { type: SchemaType.STRING, description: 'Must be one of exactly these: "Niche", "Designer", "Middle Eastern", "Mass Produced", "Clones", or "Other" (or "Liquid Deodorants" for deodorants).' },
    occasion: { type: SchemaType.STRING, description: 'Must be one of exactly these: "Date Night", "Meeting", "Casual", "Evening", "Office", "Party", "Gym", "Clubbing", "Formal", "Vacation", "Wedding", or "Everyday".' },
    notes: { type: SchemaType.STRING, description: 'A single string listing the full breakdown of notes including Top, Heart/Middle, and Base notes.' },
    concentration: { type: SchemaType.STRING },
    rating: { type: SchemaType.NUMBER },
    longevity_hours: { type: SchemaType.INTEGER },
    ideal_season: { type: SchemaType.STRING, description: 'Must be one of exactly these: "Spring", "Summer", "Fall", or "Winter".' },
    family: { type: SchemaType.STRING, description: 'The main olfactive family (e.g. Woody, Floral, Amber)' },
    character: { type: SchemaType.STRING, description: 'Short description of the character (e.g. Dark, Fresh, Sweet)' },
    projection: { type: SchemaType.STRING, description: '(e.g. Strong, Moderate, Intimate)' },
    longevity: { type: SchemaType.STRING, description: '(e.g. 8 hours, Long lasting)' },
    season_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    occasion_tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    top_notes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    heart_notes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    base_notes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    description: { type: SchemaType.STRING, description: 'A 2-3 sentence engaging description' },
    release_year: { type: SchemaType.INTEGER, nullable: true },
  },
  required: ['category', 'occasion', 'notes', 'concentration', 'rating', 'longevity_hours', 'ideal_season', 'family', 'character', 'projection', 'longevity', 'season_tags', 'occasion_tags', 'top_notes', 'heart_notes', 'base_notes', 'description'],
}

// Bypass RLS for accessing fragrance_info_cache (service role needed to INSERT/UPDATE)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function getFragranceInfo(
  brand: string,
  name: string,
  concentration?: string,
  opts?: { forceRefresh?: boolean; userId?: string; isLiquidDeo?: boolean }
): Promise<CachedInfo> {
  const slug = canonicalSlug(brand, name, concentration)
  const forceRefresh = opts?.forceRefresh ?? false

  if (!forceRefresh) {
    // Check cache
    const { data: cached } = await supabaseAdmin
      .from('fragrance_info_cache')
      .select('*')
      .eq('canonical_slug', slug)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cached && cached.data) {
      // Fire-and-forget: update hit counts
      supabaseAdmin
        .rpc('increment_fragrance_cache_hit', { slug_val: slug })
        .then(() => {})

      // Log hit
      supabaseAdmin.from('gemini_api_log').insert({
        user_id: opts?.userId || null,
        flow: 'fragrance_info',
        cache_hit: true,
        latency_ms: 0,
      }).then(() => {})

      return cached.data as CachedInfo
    }
  }

  // Miss or forceRefresh -> Acquire Lock (Thundering Herd guard)
  await supabaseAdmin.rpc('acquire_fragrance_lock', {
    slug_val: slug
  })

  // We fallback to standard update if the RPC isn't available, but we'll try raw SQL
  // Actually, we can use raw query logic by doing an UPSERT if the row is unlocked.
  // Wait, let's just do an UPSERT from Supabase SDK:
  const now = new Date()
  const lockUntil = new Date(now.getTime() + 30000).toISOString()
  
  // We can't do complex WHERE clauses in an UPSERT using Supabase SDK easily.
  // Wait, the prompt specifies:
  // INSERT ... ON CONFLICT (canonical_slug) DO UPDATE SET locked_until = ... WHERE locked_until IS NULL ... RETURNING xmax = 0
  // Since we don't have access to run raw queries directly with Supabase SDK, let's create a plpgsql function for this.
  // Actually, I can just poll if I can't get the lock. But let's fetch first.
  
  const { data: currentCache } = await supabaseAdmin
    .from('fragrance_info_cache')
    .select('locked_until, data, expires_at')
    .eq('canonical_slug', slug)
    .maybeSingle()

  if (currentCache?.locked_until && new Date(currentCache.locked_until) > new Date()) {
    // Another worker has the lock, poll every 500ms up to 10s
    for (let i = 0; i < 20; i++) {
      await new Promise(res => setTimeout(res, 500))
      const { data: polled } = await supabaseAdmin
        .from('fragrance_info_cache')
        .select('locked_until, data, expires_at')
        .eq('canonical_slug', slug)
        .maybeSingle()
      
      if (polled && polled.data && (!polled.locked_until || new Date(polled.locked_until) <= new Date())) {
        return polled.data as CachedInfo
      }
    }
    // If it's still locked after 10s, we just proceed.
  }

  // "Acquire" lock
  await supabaseAdmin.from('fragrance_info_cache').upsert({
    canonical_slug: slug,
    brand,
    name,
    data: currentCache?.data || {}, // Keep existing data if present
    locked_until: lockUntil,
  }, { onConflict: 'canonical_slug' })

  try {
    let prompt = `You are a fragrance expert API. I am providing you with a perfume name and brand: "${name} by ${brand}".
Please return a valid JSON object with the requested keys.
1. "category": Must be one of exactly these: "Niche", "Designer", "Middle Eastern", "Mass Produced", "Clones", or "Other".
2. "occasion": Must be one of exactly these: "Date Night", "Meeting", "Casual", "Evening", "Office", "Party", "Gym", "Clubbing", "Formal", "Vacation", "Wedding", or "Everyday".
3. "notes": A single string listing the full breakdown of notes including Top, Heart/Middle, and Base notes (e.g., "Top: Bergamot, Lemon. Heart: Rose, Jasmine. Base: Vanilla, Oud").
4. "concentration": The concentration of the perfume, such as "Eau de Parfum", "Eau de Toilette", "Parfum", "Extrait de Parfum", or "Cologne".
5. "rating": A number from 0 to 5 (with one decimal) representing overall community reception (e.g., 4.2).
6. "longevity_hours": A whole number estimating how many hours the fragrance lasts on skin (e.g., 8).
7. "ideal_season": Must be one of exactly these: "Spring", "Summer", "Fall", or "Winter".
8. "family": The main olfactive family (e.g. Woody, Floral, Amber).
9. "character": Short description of the character (e.g. Dark, Fresh, Sweet).
10. "projection": (e.g. Strong, Moderate, Intimate).
11. "longevity": (e.g. 8 hours, Long lasting).
12. "season_tags": Array of strings (e.g. ["Fall", "Winter"]).
13. "occasion_tags": Array of strings (e.g. ["Date Night", "Evening"]).
14. "top_notes", "heart_notes", "base_notes": Arrays of strings for the respective notes.
15. "description": A 2-3 sentence engaging description.
16. "release_year": The release year as an integer (or null if unknown).

Return ONLY the raw JSON object, without markdown formatting or code blocks.`

    if (opts?.isLiquidDeo) {
      prompt = `You are a fragrance expert API. I am providing you with a liquid deodorant name and brand: "${name} by ${brand}".
Please return a valid JSON object with the requested keys.
1. "category": "Liquid Deodorants".
2. "occasion": Must be one of exactly these: "Date Night", "Meeting", "Casual", "Evening", "Office", "Party", "Gym", "Clubbing", "Formal", "Vacation", "Wedding", or "Everyday".
3. "notes": A single string listing ONLY the dry down / base notes of the original perfume it is based on (e.g., "Base: Vanilla, Oud, Musk"). Do NOT include Top or Heart notes.
4. "concentration": "Deodorant" or "Body Spray".
5. "rating": A number from 0 to 5.
6. "longevity_hours": A whole number estimating how many hours the deodorant lasts (e.g., 4).
7. "ideal_season": Must be one of exactly these: "Spring", "Summer", "Fall", or "Winter".
8. "family": The main olfactive family (e.g. Woody, Floral, Amber).
9. "character": Short description of the character (e.g. Dark, Fresh, Sweet).
10. "projection": (e.g. Strong, Moderate, Intimate).
11. "longevity": (e.g. 4 hours).
12. "season_tags": Array of strings (e.g. ["Fall", "Winter"]).
13. "occasion_tags": Array of strings (e.g. ["Date Night", "Evening"]).
14. "top_notes", "heart_notes": Empty arrays.
15. "base_notes": Array of strings for the dry down notes.
16. "description": A 2-3 sentence engaging description.
17. "release_year": The release year as an integer (or null if unknown).

Return ONLY the raw JSON object, without markdown formatting or code blocks.`
    }

    const fetchedData = await callGemini<CachedInfo>({
      flow: 'fragrance_info',
      userId: opts?.userId,
      systemInstruction: 'You are a fragrance expert API.',
      userPrompt: prompt,
      responseSchema: fragranceInfoSchema,
    })

    // Upsert the data
    const fetchedAt = new Date()
    const expiresAt = new Date(fetchedAt.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days
    await supabaseAdmin.from('fragrance_info_cache').upsert({
      canonical_slug: slug,
      brand,
      name,
      data: fetchedData,
      source: 'gemini',
      fetched_at: fetchedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      locked_until: null, // Release lock
      created_by: opts?.userId || null,
      updated_at: fetchedAt.toISOString()
    }, { onConflict: 'canonical_slug' })

    return fetchedData

  } catch (err) {
    // Release lock on error
    await supabaseAdmin.from('fragrance_info_cache').upsert({
      canonical_slug: slug,
      brand,
      name,
      data: currentCache?.data || {},
      locked_until: null,
    }, { onConflict: 'canonical_slug' })
    throw err
  }
}
