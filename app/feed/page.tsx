import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getFeedEvents } from '@/lib/supabase/social-queries'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function verbSentence(verb: string, m: Record<string, string>): string {
  if (verb === 'added') return `added ${m.name || 'a fragrance'}${m.brand ? ` by ${m.brand}` : ''} to their shelf`
  if (verb === 'liked') return `liked ${m.name || 'a fragrance'}${m.brand ? ` by ${m.brand}` : ''}`
  if (verb === 'followed') return `started following @${m.username || 'someone'}`
  if (verb === 'created_collection') return `created a new collection "${m.name || ''}"`
  return 'did something'
}

export default async function FeedPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  const events = await getFeedEvents()

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold text-foreground font-serif mb-8">Your Feed</h1>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Your feed is empty</h2>
            <p className="text-sm text-muted mb-6">Follow some collectors to fill your feed.</p>
            <Link href="/discover" className="inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background hover:opacity-90">
              Discover collectors →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const actor = event.actor as unknown as { id: string; username: string; display_name: string | null; avatar_url: string | null } | null
              const meta = (event.metadata || {}) as Record<string, string>
              return (
                <div key={event.id} className="rounded-2xl border border-border bg-surface p-5 hover:border-border-light transition-colors">
                  <div className="flex items-start gap-3">
                    <Link href={actor ? `/u/${actor.username}` : '#'} className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-sm font-bold text-accent">
                        {actor?.avatar_url ? <img src={actor.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : (actor?.display_name || actor?.username || '?')[0].toUpperCase()}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <Link href={actor ? `/u/${actor.username}` : '#'} className="font-semibold hover:text-accent">{actor?.display_name || actor?.username || 'Someone'}</Link>{' '}{verbSentence(event.verb, meta)}
                      </p>
                      <p className="text-xs text-muted mt-1">{timeAgo(event.created_at)}</p>
                      {(event.verb === 'added' || event.verb === 'liked') && meta.image_url && (
                        <div className="mt-3 inline-block rounded-xl border border-border bg-surface-hover overflow-hidden">
                          <img src={meta.image_url} alt={meta.name || ''} className="h-20 w-20 object-contain p-2" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
