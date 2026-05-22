'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createClient as createServerClient } from '@/utils/supabase/server'

export async function toggleUserSuspension(userId: string, currentStatus: boolean) {
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

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ suspended: !currentStatus })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function updateAccountNumber(userId: string, accountNumber: number | null) {
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

  // Explicit check for uniqueness to provide a friendly error message
  if (accountNumber !== null) {
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('account_number', accountNumber)
      .neq('id', userId)
      .maybeSingle()

    if (existingUser) {
      throw new Error(`Account #${accountNumber} is already assigned to @${existingUser.username}.`)
    }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ account_number: accountNumber })
    .eq('id', userId)

  if (error) {
    if (error.code === '23505') { // Unique violation fallback
      throw new Error(`Account #${accountNumber} is already assigned.`)
    }
    throw new Error(error.message)
  }
}
