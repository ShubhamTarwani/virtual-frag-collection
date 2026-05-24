import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AdminCachePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Auth & Admin Guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') redirect('/')

  // Fetch stats from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // NOTE: In a real app we might use RPC aggregations. Here we fetch data and aggregate in memory for simplicity.
  // Or we can do basic queries. Since we need sum/count, we'll fetch logs from today.
  const { data: todayLogs } = await supabase
    .from('gemini_api_log')
    .select('cache_hit, input_tokens, output_tokens')
    .gte('created_at', today.toISOString())

  let todayCalls = 0
  let todayHits = 0
  let todayInputTokens = 0
  let todayOutputTokens = 0

  todayLogs?.forEach(log => {
    todayCalls++
    if (log.cache_hit) todayHits++
    if (log.input_tokens) todayInputTokens += log.input_tokens
    if (log.output_tokens) todayOutputTokens += log.output_tokens
  })

  const hitRate = todayCalls > 0 ? ((todayHits / todayCalls) * 100).toFixed(1) : '0.0'
  // Gemini 3.1 Flash cost approx: $0.075 / 1M input, $0.30 / 1M output (just an estimation)
  const estimatedCost = (todayInputTokens / 1000000) * 0.075 + (todayOutputTokens / 1000000) * 0.30

  // Top 20 Most Hit
  const { data: topHit } = await supabase
    .from('fragrance_info_cache')
    .select('brand, name, hit_count, canonical_slug')
    .order('hit_count', { ascending: false })
    .limit(20)

  // Expiring Soon (Next 7 days)
  // eslint-disable-next-line
  const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const { data: expiringSoon } = await supabase
    .from('fragrance_info_cache')
    .select('brand, name, expires_at, canonical_slug')
    .lte('expires_at', next7Days.toISOString())
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(20)

  // Failed Lookups
  const { data: failedLookups } = await supabase
    .from('gemini_api_log')
    .select('id, created_at, flow, error')
    .not('error', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Smart Cache Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm text-zinc-500 font-medium">Today&apos;s API Calls</h3>
          <p className="text-3xl font-bold mt-2">{todayCalls}</p>
        </div>
        <div className="p-6 border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm text-zinc-500 font-medium">Cache Hits</h3>
          <p className="text-3xl font-bold mt-2 text-green-600">{todayHits}</p>
        </div>
        <div className="p-6 border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm text-zinc-500 font-medium">Hit Rate</h3>
          <p className="text-3xl font-bold mt-2">{hitRate}%</p>
        </div>
        <div className="p-6 border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="text-sm text-zinc-500 font-medium">Est. Cost (Today)</h3>
          <p className="text-3xl font-bold mt-2">${estimatedCost.toFixed(5)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Top Hits */}
        <div className="border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h2 className="font-semibold text-lg">Top Cached Fragrances</h2>
          </div>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
            {topHit?.map(item => (
              <li key={item.canonical_slug} className="px-6 py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.brand}</p>
                  <p className="text-sm text-zinc-500">{item.name}</p>
                </div>
                <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-sm font-medium">
                  {item.hit_count} hits
                </span>
              </li>
            ))}
            {(!topHit || topHit.length === 0) && (
              <li className="px-6 py-8 text-center text-zinc-500 text-sm">No cache hits yet.</li>
            )}
          </ul>
        </div>

        {/* Failed Lookups */}
        <div className="border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <h2 className="font-semibold text-lg text-red-600 dark:text-red-400">Failed Lookups</h2>
          </div>
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
            {failedLookups?.map(item => (
              <li key={item.id} className="px-6 py-3">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{item.flow}</span>
                  <span className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400 font-mono break-words">{item.error}</p>
              </li>
            ))}
            {(!failedLookups || failedLookups.length === 0) && (
              <li className="px-6 py-8 text-center text-zinc-500 text-sm">No failed lookups.</li>
            )}
          </ul>
        </div>
      </div>
      
      {/* Expiring Soon */}
      <div className="border rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="font-semibold text-lg">Expiring within 7 Days</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500">Slug</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Brand</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Name</th>
                <th className="px-6 py-3 font-medium text-zinc-500">Expires At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {expiringSoon?.map(item => (
                <tr key={item.canonical_slug} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-3 font-mono text-xs">{item.canonical_slug}</td>
                  <td className="px-6 py-3">{item.brand}</td>
                  <td className="px-6 py-3">{item.name}</td>
                  <td className="px-6 py-3 text-amber-600 dark:text-amber-400">{new Date(item.expires_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {(!expiringSoon || expiringSoon.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">Nothing expiring soon.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  )
}
