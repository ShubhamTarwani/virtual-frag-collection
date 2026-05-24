import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url)
    const idsParam = searchParams.get('ids')
    
    if (!idsParam) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 })
    }

    const ids = idsParam.split(',').filter(id => id.trim() !== '')

    const { data: jobs, error } = await supabase
      .from('gemini_queue')
      .select('id, status, error')
      .in('id', ids)

    if (error) throw error

    const statusCounts = {
      pending: 0,
      processing: 0,
      done: 0,
      error: 0
    }
    
    const errors: {id: string; message: string}[] = []

    jobs?.forEach(job => {
      statusCounts[job.status as keyof typeof statusCounts]++
      if (job.status === 'error') {
        errors.push({ id: job.id, message: job.error })
      }
    })

    return NextResponse.json({ 
      counts: statusCounts,
      errors,
      total: ids.length
    })

  } catch (err: unknown) {
    console.error('[queue-status] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
