import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import type { Profile } from './queries'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActivityEvent = {
  id: string
  actor_id: string
  verb: string
  object_type: string | null
  object_id: string | null
  metadata: Record<string, string>
  created_at: string
  actor?: Profile
}

export type ProfileWithCounts = Profile & {
  follower_count: number
  following_count: number
  fragrance_count: number
  like_count: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSupabase() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

// ---------------------------------------------------------------------------
// Follow queries
// ---------------------------------------------------------------------------

export async function getFollowerCount(userId: string): Promise<number> {
  const supabase = await getSupabase()
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)
  return count ?? 0
}

export async function getFollowingCount(userId: string): Promise<number> {
  const supabase = await getSupabase()
  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)
  return count ?? 0
}

export async function isFollowing(targetUserId: string): Promise<boolean> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  return data !== null
}

export async function isFollowedBy(targetUserId: string): Promise<boolean> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', targetUserId)
    .eq('following_id', user.id)
    .maybeSingle()

  return data !== null
}

export async function getFollowers(userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('follows')
    .select('follower_id, created_at, profiles:follower_id(id, username, display_name, avatar_url, bio)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })

  return (data ?? []) as unknown as Array<{
    follower_id: string
    created_at: string
    profiles: Profile
  }>
}

export async function getFollowing(userId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('follows')
    .select('following_id, created_at, profiles:following_id(id, username, display_name, avatar_url, bio)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })

  return (data ?? []) as unknown as Array<{
    following_id: string
    created_at: string
    profiles: Profile
  }>
}

// ---------------------------------------------------------------------------
// Like queries
// ---------------------------------------------------------------------------

export async function getLikeCount(fragranceId: string): Promise<number> {
  const supabase = await getSupabase()
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('fragrance_id', fragranceId)
  return count ?? 0
}

export async function isLiked(fragranceId: string): Promise<boolean> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('fragrance_id', fragranceId)
    .maybeSingle()

  return data !== null
}

export async function getFragranceCount(userId: string): Promise<number> {
  const supabase = await getSupabase()
  const { count } = await supabase
    .from('perfumes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export async function getFeedEvents(limit = 50): Promise<ActivityEvent[]> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get IDs of people I follow
  const { data: followData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (followData ?? []).map(f => f.following_id)
  if (followingIds.length === 0) return []

  const { data } = await supabase
    .from('activity_events')
    .select('*, actor:actor_id(id, username, display_name, avatar_url)')
    .in('actor_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as unknown as ActivityEvent[]
}

// ---------------------------------------------------------------------------
// Notifications: has new followers since last seen
// ---------------------------------------------------------------------------

export async function hasNewNotifications(): Promise<boolean> {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Get last_seen_notifications
  const { data: profile } = await supabase
    .from('profiles')
    .select('last_seen_notifications')
    .eq('id', user.id)
    .single()

  if (!profile) return false

  const lastSeen = profile.last_seen_notifications || '1970-01-01'

  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', user.id)
    .gt('created_at', lastSeen)

  return (count ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Discover queries
// ---------------------------------------------------------------------------

export async function getMostFollowedCollectors(limit = 12) {
  const supabase = await getSupabase()

  // Get follower counts grouped by following_id, then join profiles
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio')
    .eq('is_public', true)
    .limit(limit)

  if (!data || data.length === 0) return []

  // Get follower counts for each
  const results = await Promise.all(
    data.map(async (profile) => {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id)
      return { ...profile, follower_count: count ?? 0 }
    })
  )

  return results.sort((a, b) => b.follower_count - a.follower_count)
}

export async function getMostLikedFragrancesThisWeek(limit = 12) {
  const supabase = await getSupabase()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: likes } = await supabase
    .from('likes')
    .select('fragrance_id')
    .gt('created_at', oneWeekAgo)

  if (!likes || likes.length === 0) return []

  // Count likes per fragrance
  const counts = new Map<string, number>()
  likes.forEach(l => {
    counts.set(l.fragrance_id, (counts.get(l.fragrance_id) || 0) + 1)
  })

  // Get top fragrance IDs
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  const fragranceIds = sorted.map(s => s[0])
  if (fragranceIds.length === 0) return []

  const { data: fragrances } = await supabase
    .from('perfumes')
    .select('id, name, brand, image_url, user_id')
    .in('id', fragranceIds)

  return (fragrances ?? []).map(f => ({
    ...f,
    like_count: counts.get(f.id) || 0,
  })).sort((a, b) => b.like_count - a.like_count)
}

export async function getTrendingCollectors(limit = 12) {
  const supabase = await getSupabase()
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentFollows } = await supabase
    .from('follows')
    .select('following_id')
    .gt('created_at', threeDaysAgo)

  if (!recentFollows || recentFollows.length === 0) return []

  const counts = new Map<string, number>()
  recentFollows.forEach(f => {
    counts.set(f.following_id, (counts.get(f.following_id) || 0) + 1)
  })

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  const userIds = sorted.map(s => s[0])
  if (userIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio')
    .in('id', userIds)

  return (profiles ?? []).map(p => ({
    ...p,
    recent_followers: counts.get(p.id) || 0,
  })).sort((a, b) => b.recent_followers - a.recent_followers)
}
