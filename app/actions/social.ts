'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToggleResult = {
  active: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Toggle follow
// ---------------------------------------------------------------------------

export async function toggleFollow(targetUserId: string): Promise<ToggleResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { active: false, error: 'Not authenticated' }

  if (user.id === targetUserId) {
    return { active: false, error: 'Cannot follow yourself' }
  }

  // Check if already following
  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  if (existing) {
    // Unfollow
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)

    if (error) return { active: true, error: error.message }
    return { active: false }
  } else {
    // Follow
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetUserId })

    if (error) return { active: false, error: error.message }
    return { active: true }
  }
}

// ---------------------------------------------------------------------------
// Toggle like
// ---------------------------------------------------------------------------

export async function toggleLike(fragranceId: string): Promise<ToggleResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { active: false, error: 'Not authenticated' }

  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('fragrance_id', fragranceId)
    .maybeSingle()

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('fragrance_id', fragranceId)

    if (error) return { active: true, error: error.message }
    return { active: false }
  } else {
    // Like
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: user.id, fragrance_id: fragranceId })

    if (error) return { active: false, error: error.message }
    return { active: true }
  }
}

// ---------------------------------------------------------------------------
// Mark notifications as seen
// ---------------------------------------------------------------------------

export async function markNotificationsSeen(): Promise<void> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('profiles')
    .update({ last_seen_notifications: new Date().toISOString() })
}

// ---------------------------------------------------------------------------
// Search users
// ---------------------------------------------------------------------------

export async function searchUsers(query: string) {
  if (!query || query.trim() === '') return []
  
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const searchTerm = `%${query.trim()}%`

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('is_public', true)
    .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
    .limit(5)

  if (error) {
    console.error('Search error:', error)
    return []
  }

  return data
}
