import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

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
  if (verb === 'liked') return `liked your fragrance${m.name ? ` ${m.name}` : ''}`
  if (verb === 'followed') return `started following you`
  return 'interacted with you'
}

export default async function NotificationsPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Mark notifications as seen
  await supabase
    .from('profiles')
    .update({ last_seen_notifications: new Date().toISOString() })
    .eq('id', profile.id)

  // Get user's fragrances
  const { data: myPerfumes } = await supabase.from('perfumes').select('id').eq('user_id', profile.id)
  const myPerfumeIds = myPerfumes?.map(p => p.id) || []
  
  // Get notifications
  let orQuery = `and(verb.eq.followed,object_id.eq.${profile.id})`
  if (myPerfumeIds.length > 0) {
    orQuery += `,and(verb.eq.liked,object_id.in.(${myPerfumeIds.join(',')}))`
  }

  const { data: events } = await supabase
    .from('activity_events')
    .select('*, actor:actor_id(id, username, display_name, avatar_url)')
    .or(orQuery)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-bold text-foreground font-serif mb-8">Notifications</h1>
        {!events || events.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-12 text-center">
            <div className="text-4xl mb-4">🔕</div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No notifications yet</h2>
            <p className="text-sm text-muted mb-6">When someone follows you or likes your fragrances, it will show up here.</p>
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
                      {event.verb === 'liked' && meta.image_url && (
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
