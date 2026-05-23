'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { getFragranceInfo } from '@/lib/cache/fragrance-info'

export async function getMissingMetadataCount() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { count, error } = await supabaseAdmin
    .from('perfumes')
    .select('*', { count: 'exact', head: true })
    .or('category.is.null,notes.is.null,category.eq."",notes.eq.""')

  if (error) throw new Error(error.message)
  return count || 0
}

export async function processMetadataBatch() {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(cookieStore)
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch 10 perfumes missing metadata
  const { data: perfumes } = await supabaseAdmin
    .from('perfumes')
    .select('id, name, brand')
    .or('category.is.null,notes.is.null,category.eq."",notes.eq.""')
    .limit(10)

  if (!perfumes || perfumes.length === 0) return 0

  let processedCount = 0

  for (const perfume of perfumes) {
    try {
      if (!perfume.name || !perfume.brand) continue;

      const parsed = await getFragranceInfo(perfume.brand, perfume.name, undefined, {
        userId: user.id
      });

      // Update perfume
      await supabaseAdmin.from('perfumes').update({
        category: parsed.category,
        occasion: parsed.occasion,
        notes: parsed.notes,
        concentration: parsed.concentration,
        rating: parsed.rating,
        longevity_hours: parsed.longevity_hours,
        ideal_season: parsed.ideal_season
      }).eq('id', perfume.id)

      processedCount++
    } catch (e) {
      console.error('Error processing batch item:', e)
    }
  }

  return processedCount
}
