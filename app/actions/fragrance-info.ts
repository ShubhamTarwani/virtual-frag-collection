'use strict'
'use server'

import { getFragranceInfo as fetchFragranceInfo } from '@/lib/cache/fragrance-info'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit } from '@/lib/ratelimit'

export async function getFragranceInfo(
  brand: string,
  name: string,
  concentration?: string,
  opts?: { forceRefresh?: boolean; isLiquidDeo?: boolean; skipCacheWrite?: boolean }
) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Rate Limiting (Using our new bucket-based limits)
  const { allowed } = await checkRateLimit({
    userId: user.id,
    bucket: 'fragrance_info',
    limit: 30,
    windowSeconds: 3600 // 1 hour
  })

  if (!allowed) {
    throw new Error("You've reached the lookups limit for this hour. Please try again later.")
  }

  return fetchFragranceInfo(brand, name, concentration, {
    forceRefresh: opts?.forceRefresh,
    userId: user.id,
    isLiquidDeo: opts?.isLiquidDeo,
    skipCacheWrite: opts?.skipCacheWrite,
  })
}
