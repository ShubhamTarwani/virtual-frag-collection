'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { z } from 'zod'

const fragranceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  house: z.string().min(1, 'House is required'),
  family: z.string().min(1, 'Family is required'),
  character: z.string().optional(),
  projection: z.string().optional(),
  longevity: z.string().optional(),
  season_tags: z.array(z.string()).optional(),
  occasion_tags: z.array(z.string()).optional(),
  top_notes: z.array(z.string()).optional(),
  heart_notes: z.array(z.string()).optional(),
  base_notes: z.array(z.string()).optional(),
  description: z.string().optional(),
  release_year: z.number().nullable().optional(),
  image_url: z.string().optional(),
  cloudinary_public_id: z.string().optional(),
  verified: z.boolean().default(false)
})

export async function saveMasterFragrance(data: z.infer<typeof fragranceSchema>, id?: string) {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(cookieStore)
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    throw new Error('Unauthorized')
  }

  const parsed = fragranceSchema.parse(data)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (id) {
    const { error } = await supabaseAdmin
      .from('master_fragrances')
      .update(parsed)
      .eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabaseAdmin
      .from('master_fragrances')
      .insert([parsed])
    if (error) throw new Error(error.message)
  }
}

export async function deleteMasterFragrance(id: string) {
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
    .from('master_fragrances')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}

export async function toggleVerifiedStatus(id: string, currentStatus: boolean) {
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
    .from('master_fragrances')
    .update({ verified: !currentStatus })
    .eq('id', id)
  
  if (error) throw new Error(error.message)
}
