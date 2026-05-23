import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFragranceInfo } from '@/lib/cache/fragrance-info'

// Vercel Cron will send this secret
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Claim up to 10 jobs
    const { data: jobs, error: claimError } = await supabaseAdmin.rpc('claim_gemini_jobs', { batch_size: 10 })
    
    if (claimError) {
      console.error('[queue-worker] Failed to claim jobs:', claimError)
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ processed: 0, pending_remaining: 0 })
    }

    let processed = 0
    let errors = 0

    for (const job of jobs) {
      try {
        const payload = job.payload as { brand: string; name: string; concentration?: string }
        
        // Lookup (will use Gemini if not in cache)
        const result = await getFragranceInfo(payload.brand, payload.name, payload.concentration)
        
        await supabaseAdmin.from('gemini_queue').update({
          status: 'done',
          result: result as any,
          completed_at: new Date().toISOString()
        }).eq('id', job.id)
        
        processed++
      } catch (err: any) {
        errors++
        console.error(`[queue-worker] Job ${job.id} failed:`, err)
        
        const newStatus = job.attempts >= 3 ? 'error' : 'pending'
        await supabaseAdmin.from('gemini_queue').update({
          status: newStatus,
          error: err.message || String(err),
          completed_at: newStatus === 'error' ? new Date().toISOString() : null
        }).eq('id', job.id)
      }

      // Add 1s delay to prevent hammering rate limits
      await new Promise(res => setTimeout(res, 1000))
    }

    const { count: pendingRemaining } = await supabaseAdmin
      .from('gemini_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    return NextResponse.json({ processed, errors, pending_remaining: pendingRemaining || 0 })

  } catch (err: any) {
    console.error('[queue-worker] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
