import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { RESERVED_USERNAMES } from '@/lib/reserved-usernames'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Profile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  accent_color: string
  is_public: boolean
  role: string
  account_number: number | null
  created_at: string
  updated_at: string
}

export type Perfume = {
  id: string
  name: string | null
  brand: string | null
  category: string | null
  concentration: string | null
  image_url: string | null
  cloudinary_public_id?: string | null
  shelf_row: number | null
  occasion: string | null
  notes: string | null
  rating: number | null
  longevity_hours: number | null
  ideal_season: string | null
  user_id: string
}

export type Collection = {
  id: string
  user_id: string
  name: string
  slug: string
  description: string | null
  is_public: boolean
  sort_order: number
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSupabase() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}

// ---------------------------------------------------------------------------
// Profile queries
// ---------------------------------------------------------------------------

/**
 * Fetch a profile by username (public or own).
 */
export async function getProfileByUsername(username: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, accent_color, is_public, role, account_number, created_at, updated_at')
    .eq('username', username.toLowerCase())
    .single()

  if (error) return null
  return data as Profile
}

/**
 * Get the currently authenticated user's profile.
 */
export async function getCurrentProfile() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, accent_color, is_public, role, account_number, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data as Profile
}

// ---------------------------------------------------------------------------
// Fragrance queries
// ---------------------------------------------------------------------------

/**
 * Fetch public fragrances for a given user id.
 * RLS handles visibility — this only returns rows the caller is allowed to see.
 */
export async function getPublicFragrancesByUserId(userId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('perfumes')
    .select('id, name, brand, category, concentration, image_url, cloudinary_public_id, shelf_row, occasion, notes, rating, longevity_hours, ideal_season, user_id, is_decant, decant_volume_ml, decant_source, decant_finished, visibility, created_at, updated_at')
    .eq('user_id', userId)
    .order('shelf_row', { ascending: true })

  if (error) return []
  return (data ?? []) as Perfume[]
}

/**
 * Fetch the currently authenticated user's fragrances.
 */
export async function getMyFragrances() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('perfumes')
    .select('*')
    .eq('user_id', user.id)
    .order('shelf_row', { ascending: true })

  if (error) return []
  return (data ?? []) as Perfume[]
}

// ---------------------------------------------------------------------------
// Username availability
// ---------------------------------------------------------------------------

/**
 * Check if a username is available (not taken and not reserved).
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const lower = username.toLowerCase()

  // Check reserved list first (no DB call needed)
  if (RESERVED_USERNAMES.has(lower)) return false

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', lower)
    .maybeSingle()

  if (error) return false
  return data === null
}

// ---------------------------------------------------------------------------
// Collection queries
// ---------------------------------------------------------------------------

/**
 * Fetch collections for a user (RLS-gated).
 */
export async function getCollectionsByUserId(userId: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (error) return []
  return (data ?? []) as Collection[]
}
