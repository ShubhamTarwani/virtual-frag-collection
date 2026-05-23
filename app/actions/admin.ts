'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

async function checkAdmin() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }
  return { supabase, user }
}

export async function getAccounts(searchQuery?: string) {
  await checkAdmin()
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  let query = supabase.from('profiles').select('id, username, display_name, account_number').order('account_number', { ascending: true })
  
  if (searchQuery) {
    // Basic search on username
    query = query.ilike('username', `%${searchQuery}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function getReservedNumbers() {
  await checkAdmin()
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // Need to bypass RLS for reserved table because it's only viewable by service role
  // Actually, we can use the service role client since this is an admin action
  const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin.from('reserved_account_numbers').select('*')
  if (error) throw new Error(error.message)
  return data
}

export async function assignAccountNumber(userId: string, newNumber: number) {
  const { user } = await checkAdmin()
  
  const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (newNumber === 0) {
    return { success: false, error: 'Cannot assign #0 here. Use the Make Founder action instead.' }
  }

  const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = callerProfile?.role === 'admin'

  // 1. Check if number is reserved
  const { data: reserved } = await supabaseAdmin.from('reserved_account_numbers').select('number').eq('number', newNumber).single()
  if (reserved && !isAdmin) {
    return { success: false, error: 'Cannot assign a reserved number' }
  }

  // 2. Get old number for user A
  const { data: profile } = await supabaseAdmin.from('profiles').select('account_number').eq('id', userId).single()
  const oldNumber = profile?.account_number

  // 3. Check if number is already taken (Swap logic)
  const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('account_number', newNumber).single()
  
  if (existing) {
    if (existing.id === userId) {
      return { success: false, error: 'User already has this number' }
    }

    // SWAP: Set B to null first to avoid unique constraint
    await supabaseAdmin.from('profiles').update({ account_number: null }).eq('id', existing.id)
    // Set A to new number
    const { error: updateErrorA } = await supabaseAdmin.from('profiles').update({ account_number: newNumber }).eq('id', userId)
    if (updateErrorA) return { success: false, error: updateErrorA.message }
    // Set B to A's old number (which could be null)
    await supabaseAdmin.from('profiles').update({ account_number: oldNumber }).eq('id', existing.id)

    // Log both changes
    await supabaseAdmin.from('account_number_audit_log').insert([
      { changed_by: user.id, target_user: userId, old_number: oldNumber, new_number: newNumber },
      { changed_by: user.id, target_user: existing.id, old_number: newNumber, new_number: oldNumber }
    ])

    return { success: true }
  }

  // 4. Normal assign (no swap)
  const { error: updateError } = await supabaseAdmin.from('profiles').update({ account_number: newNumber }).eq('id', userId)
  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 5. Audit log
  await supabaseAdmin.from('account_number_audit_log').insert({
    changed_by: user.id,
    target_user: userId,
    old_number: oldNumber,
    new_number: newNumber
  })

  return { success: true }
}

export async function assignFounderNumber(userId: string) {
  const { user } = await checkAdmin()
  
  const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Explicit check for founder number 0
  const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('account_number', 0).single()
  if (existing) {
    return { success: false, error: 'Founder number is already assigned!' }
  }

  const { data: profile } = await supabaseAdmin.from('profiles').select('account_number').eq('id', userId).single()
  const oldNumber = profile?.account_number

  const { error: updateError } = await supabaseAdmin.from('profiles').update({ account_number: 0 }).eq('id', userId)
  if (updateError) {
    return { success: false, error: updateError.message }
  }

  await supabaseAdmin.from('account_number_audit_log').insert({
    changed_by: user.id,
    target_user: userId,
    old_number: oldNumber,
    new_number: 0
  })

  return { success: true }
}

export async function checkNumberHolder(accountNumber: number) {
  await checkAdmin()
  const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabaseAdmin.from('profiles').select('username').eq('account_number', accountNumber).single()
  return data?.username || null
}
