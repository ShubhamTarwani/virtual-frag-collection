import { createClient } from '@supabase/supabase-js'
import { canonicalSlug } from '@/lib/cache/slug'
import { checkRateLimit } from '@/lib/ratelimit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function enqueueFragranceInfo(
  userId: string,
  items: Array<{ brand: string; name: string; concentration?: string }>
): Promise<{ enqueued: number; cached: number; jobIds: string[] }> {
  let enqueued = 0
  let cached = 0
  const jobIds: string[] = []

  // Check rate limit first
  const { allowed } = await checkRateLimit({
    userId,
    bucket: 'bulk_import',
    limit: 100, // 100 items per day
    windowSeconds: 86400 // 24 hours
  })

  if (!allowed) {
    throw new Error('You have reached your daily limit for bulk imports. Please try again tomorrow.')
  }

  for (const item of items) {
    const slug = canonicalSlug(item.brand, item.name, item.concentration)

    const { data: cachedRow } = await supabaseAdmin
      .from('fragrance_info_cache')
      .select('canonical_slug')
      .eq('canonical_slug', slug)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cachedRow) {
      cached++
    } else {
      const { data: job, error } = await supabaseAdmin
        .from('gemini_queue')
        .insert({
          user_id: userId,
          job_type: 'fragrance_info',
          payload: item,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[enqueue] Error inserting job:', error)
      } else if (job) {
        jobIds.push(job.id)
        enqueued++
      }
    }
  }

  return { enqueued, cached, jobIds }
}
