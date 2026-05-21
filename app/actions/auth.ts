'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { validateUsername } from '@/lib/reserved-usernames'
import { isUsernameAvailable } from '@/lib/supabase/queries'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthState = {
  error?: string
  success?: string
} | undefined

// ---------------------------------------------------------------------------
// Sign up with magic link
// ---------------------------------------------------------------------------

export async function signUpWithMagicLink(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : ''}${getBaseUrl()}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email for a magic link!' }
}

// ---------------------------------------------------------------------------
// Sign in with password
// ---------------------------------------------------------------------------

export async function signInWithPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
  redirect('/login')
}

// ---------------------------------------------------------------------------
// Complete onboarding (set username, display name, bio)
// ---------------------------------------------------------------------------

export async function completeOnboarding(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const username = (formData.get('username') as string || '').toLowerCase().trim()
  const displayName = (formData.get('display_name') as string || '').trim()
  const bio = (formData.get('bio') as string || '').trim()

  // Validate username
  const usernameError = validateUsername(username)
  if (usernameError) {
    return { error: usernameError }
  }

  // Validate bio length
  if (bio.length > 280) {
    return { error: 'Bio must be 280 characters or fewer' }
  }

  // Check availability
  const available = await isUsernameAvailable(username)
  if (!available) {
    return { error: 'This username is already taken' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      username,
      display_name: displayName || null,
      bio: bio || null,
    })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'This username is already taken' }
    }
    return { error: error.message }
  }

  redirect(`/`)
}

// ---------------------------------------------------------------------------
// Check username availability (called from client via server action)
// ---------------------------------------------------------------------------

export async function checkUsernameAvailable(username: string): Promise<{
  available: boolean
  error?: string
}> {
  const validationError = validateUsername(username)
  if (validationError) {
    return { available: false, error: validationError }
  }

  const available = await isUsernameAvailable(username)
  return { available }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
