import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getWearInsights } from '@/app/actions/wardrobe'
import SmartImage from '@/components/ui/SmartImage'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Insights · Wardrobe',
  description: 'Patterns and analytics from your wear history.',
}

export default async function InsightsPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const insights = await getWearInsights()

  return (
    <main className="min-h-screen bg-[var(--background)] max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-[var(--foreground)]">Insights</h1>
        <Link href="/wardrobe" className="text-sm text-[var(--accent)] hover:underline">← Back</Link>
      </div>

      {!insights ? (
        <p className="text-[var(--muted)] text-center py-16">Log some wears to see patterns here.</p>
      ) : (
        <div className="space-y-8">

          {/* Streak */}
          {insights.streak > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
              <p className="text-5xl mb-2">🔥</p>
              <p className="font-serif text-3xl font-bold text-[var(--foreground)]">{insights.streak}</p>
              <p className="text-[var(--muted)] text-sm">day streak</p>
            </div>
          )}

          {/* Most worn this month */}
          {insights.mostWorn.length > 0 && (
            <div>
              <p className="drawer-label mb-3">Most-worn this month</p>
              <div className="space-y-2">
                {insights.mostWorn.map((item, i) => (
                  <div key={item.bottle?.id ?? i} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3" data-fragrance-card={true}>
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-hover)] shrink-0 flex items-center justify-center">
                      {item.bottle?.image_url ? (
                        <SmartImage src={item.bottle.image_url} alt={item.bottle.name ?? ''} width={40} height={40} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-lg">🧴</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--foreground)] text-sm truncate">{item.bottle?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-[var(--muted)]">{item.bottle?.brand}</p>
                    </div>
                    <span className="text-sm font-bold text-[var(--accent)]">{item.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unsung citizens */}
          {insights.unsung.length > 0 && (
            <div>
              <p className="drawer-label mb-1">Unsung shelf citizens</p>
              <p className="text-xs text-[var(--muted)] mb-3">Owned 30+ days, not worn this month</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {insights.unsung.map((bottle) => (
                  <div key={bottle.id} className="shrink-0 flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 min-w-[100px]" data-fragrance-card={true}>
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-center">
                      {bottle.image_url ? (
                        <SmartImage src={bottle.image_url} alt={bottle.name ?? ''} width={56} height={56} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl">🧴</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--foreground)] font-semibold text-center leading-tight">{bottle.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Occasion patterns */}
          {insights.patterns.length > 0 && (
            <div>
              <p className="drawer-label mb-3">Your patterns</p>
              <div className="space-y-2">
                {insights.patterns.map((p) => (
                  <div key={p.occasion} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex items-center justify-between">
                    <p className="text-sm text-[var(--muted)] capitalize">{p.occasion}</p>
                    <p className="text-xs font-mono text-[var(--foreground)]">{p.topBottleId.slice(0, 8)}…</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.mostWorn.length === 0 && insights.unsung.length === 0 && (
            <div className="text-center py-12 text-[var(--muted)]">
              <p className="text-4xl mb-3">📊</p>
              <p>Log more wears to see patterns emerge.</p>
              <Link href="/wardrobe" className="mt-4 inline-block text-[var(--accent)] text-sm hover:underline">
                Find today&apos;s fragrance →
              </Link>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
