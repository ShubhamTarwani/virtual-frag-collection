import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getWearHistory } from '@/app/actions/wardrobe'
import SmartImage from '@/components/ui/SmartImage'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wear History · Wardrobe',
  description: 'Your fragrance wear log timeline.',
}

export const revalidate = 60

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function groupByDay(logs: Awaited<ReturnType<typeof getWearHistory>>) {
  const groups: Record<string, typeof logs> = {}
  for (const log of logs) {
    const d = new Date(log.worn_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(log)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === yesterday.getTime()) return 'Yesterday'
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default async function HistoryPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const logs = await getWearHistory(100)
  const grouped = groupByDay(logs)

  return (
    <main className="min-h-screen bg-[var(--background)] max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-[var(--foreground)]">Wear History</h1>
        <Link href="/wardrobe" className="text-sm text-[var(--accent)] hover:underline">← Back</Link>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          <p className="text-4xl mb-3">🧴</p>
          <p className="font-medium">No wear logs yet</p>
          <p className="text-sm mt-1">Start by getting a recommendation and logging your wear.</p>
          <Link href="/wardrobe" className="mt-4 inline-block text-[var(--accent)] text-sm hover:underline">
            Find today&apos;s fragrance →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([key, dayLogs]) => (
            <div key={key}>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">{dayLabel(key)}</p>
              <div className="space-y-3">
                {dayLogs.map((log) => {
                  const bottle = log.perfumes
                  return (
                    <div key={log.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3" data-fragrance-card={true}>
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-hover)] shrink-0 flex items-center justify-center">
                        {bottle?.image_url ? (
                          <SmartImage src={bottle.image_url} alt={bottle.name ?? ''} width={48} height={48} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl">🧴</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--foreground)] text-sm truncate">{bottle?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-[var(--muted)]">{bottle?.brand}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {log.occasion && <span className="note-tag">{log.occasion}</span>}
                          {log.season && <span className="note-tag">{log.season}</span>}
                          {log.time_of_day && <span className="note-tag">{log.time_of_day}</span>}
                          {log.source === 'wardrobe_ai' && <span className="note-tag top">AI pick</span>}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--muted)] shrink-0">{relativeTime(log.worn_at)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
