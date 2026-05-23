import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Auth & Admin check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { slug, all } = body

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (all) {
      const confirmHeader = req.headers.get('X-Confirm')
      if (confirmHeader !== 'yes') {
        return NextResponse.json({ error: 'Missing X-Confirm header' }, { status: 400 })
      }
      
      // Expire all entries
      const { error } = await supabaseAdmin
        .from('fragrance_info_cache')
        .update({ expires_at: new Date().toISOString() })
        .neq('canonical_slug', '')

      if (error) throw error
      return NextResponse.json({ success: true, message: 'All cache entries expired' })
    }

    if (slug) {
      const { error } = await supabaseAdmin
        .from('fragrance_info_cache')
        .update({ expires_at: new Date().toISOString() })
        .eq('canonical_slug', slug)
        
      if (error) throw error
      return NextResponse.json({ success: true, message: `Cache entry for ${slug} expired` })
    }

    return NextResponse.json({ error: 'Must provide either slug or all=true' }, { status: 400 })

  } catch (err: any) {
    console.error('[Admin Cache Invalidate Error]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
