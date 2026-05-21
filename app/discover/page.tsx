import Link from 'next/link'
import { getMostFollowedCollectors, getMostLikedFragrancesThisWeek, getTrendingCollectors } from '@/lib/supabase/social-queries'

export default async function DiscoverPage() {
  const [topCollectors, topFragrances, trending] = await Promise.all([
    getMostFollowedCollectors(12),
    getMostLikedFragrancesThisWeek(12),
    getTrendingCollectors(12),
  ])

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">Explore</span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Discover</h1>
          <p className="text-sm text-muted mt-2">Find collectors and fragrances to follow</p>
        </div>

        {/* Most Followed Collectors */}
        <section className="mb-14">
          <h2 className="text-lg font-semibold text-foreground mb-5">Most Followed Collectors</h2>
          {topCollectors.length === 0 ? (
            <p className="text-sm text-muted">No collectors yet. Be the first!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {topCollectors.map((c) => (
                <Link key={c.id} href={`/u/${c.username}`} className="rounded-2xl border border-border bg-surface p-4 text-center hover:border-accent/50 transition-colors">
                  <div className="mx-auto h-14 w-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-lg font-bold text-accent mb-3">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : (c.display_name || c.username)[0].toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">{c.display_name || c.username}</div>
                  <div className="text-xs text-muted">@{c.username}</div>
                  <div className="text-xs text-accent mt-1">{c.follower_count} follower{c.follower_count !== 1 ? 's' : ''}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Trending Collectors */}
        <section className="mb-14">
          <h2 className="text-lg font-semibold text-foreground mb-5">🔥 Trending</h2>
          {trending.length === 0 ? (
            <p className="text-sm text-muted">No trending collectors right now.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {trending.map((c) => (
                <Link key={c.id} href={`/u/${c.username}`} className="rounded-2xl border border-border bg-surface p-4 text-center hover:border-accent/50 transition-colors">
                  <div className="mx-auto h-14 w-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-lg font-bold text-accent mb-3">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : (c.display_name || c.username)[0].toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold text-foreground truncate">{c.display_name || c.username}</div>
                  <div className="text-xs text-muted">@{c.username}</div>
                  <div className="text-xs text-accent mt-1">+{c.recent_followers} new follower{c.recent_followers !== 1 ? 's' : ''}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Most Liked Fragrances This Week */}
        <section className="mb-14">
          <h2 className="text-lg font-semibold text-foreground mb-5">❤️ Most Liked This Week</h2>
          {topFragrances.length === 0 ? (
            <p className="text-sm text-muted">No likes this week yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {topFragrances.map((f) => (
                <div key={f.id} className="rounded-2xl border border-border bg-surface overflow-hidden hover:border-accent/50 transition-colors">
                  <div className="aspect-square bg-surface-hover flex items-center justify-center p-4">
                    {f.image_url ? <img src={f.image_url} alt={f.name || ''} className="h-full w-full object-contain" /> : <div className="text-3xl text-muted/30">🧴</div>}
                  </div>
                  <div className="p-3">
                    <div className="font-bold text-xs text-foreground truncate">{f.name || 'Unknown'}</div>
                    <div className="text-[10px] text-muted uppercase tracking-wider truncate">{f.brand || ''}</div>
                    <div className="text-xs text-danger mt-1">❤️ {f.like_count} like{f.like_count !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
