import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getMostFollowedCollectors } from '@/lib/supabase/social-queries'

export default async function Home() {
  const profile = await getCurrentProfile()
  const topCollectors = profile ? [] : await getMostFollowedCollectors(4)

  return (
    <div className="flex flex-col flex-1 bg-background font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full max-w-3xl h-[400px] bg-accent/5 blur-[100px] rounded-tl-full pointer-events-none" />

      {/* Hero Section */}
      <header className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-24 sm:py-32 min-h-[80vh]">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          <p className="text-[10px] sm:text-xs font-semibold tracking-[0.3em] uppercase text-accent">
            The Community for Collectors
          </p>
          <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
        </div>
        
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-foreground font-serif leading-[1.1] max-w-4xl mx-auto">
          Your Digital <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/50">Fragrance Shelf</span>
        </h1>
        
        <p className="mt-8 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
          Curate your collection, discover new scents, and connect with a community of perfume enthusiasts from around the world.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 justify-center w-full sm:w-auto">
          {profile ? (
            <Link 
              href={`/u/${profile.username}`}
              className="w-full sm:w-auto rounded-full bg-accent px-8 py-4 text-base font-medium text-background transition-all hover:bg-accent/90 hover:scale-105 shadow-lg shadow-accent/20"
            >
              View Your Shelf
            </Link>
          ) : (
            <Link 
              href="/signup"
              className="w-full sm:w-auto rounded-full bg-foreground px-8 py-4 text-base font-medium text-background transition-all hover:bg-foreground/90 hover:scale-105 shadow-lg shadow-foreground/20"
            >
              Start Your Collection
            </Link>
          )}
          
          <Link 
            href="/discover"
            className="w-full sm:w-auto rounded-full bg-surface border border-border px-8 py-4 text-base font-medium text-foreground transition-all hover:bg-surface-hover hover:border-border-light"
          >
            Explore Community
          </Link>
        </div>

        {/* Popular Collectors (Logged out only) */}
        {!profile && topCollectors.length > 0 && (
          <div className="mt-24 w-full max-w-5xl mx-auto border-t border-border pt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground font-serif">Popular Collectors</h2>
              <Link href="/discover" className="text-sm text-accent hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              {topCollectors.map((c) => (
                <Link key={c.id} href={`/u/${c.username}`} className="group rounded-2xl border border-border bg-surface p-5 hover:border-accent/50 transition-colors">
                  <div className="h-16 w-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-xl font-bold text-accent mb-4">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : (c.display_name || c.username)[0].toUpperCase()}
                  </div>
                  <div className="text-base font-semibold text-foreground truncate group-hover:text-accent transition-colors">{c.display_name || c.username}</div>
                  <div className="text-sm text-muted">@{c.username}</div>
                  <div className="text-xs font-medium text-accent mt-2">{c.follower_count} followers</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto text-left w-full border-t border-border pt-16">
          <div>
            <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl mb-6">
              ✨
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 font-serif">Curate Beautifully</h3>
            <p className="text-muted leading-relaxed">Build a stunning visual portfolio of your fragrances. Organize by type, occasion, and scent profile.</p>
          </div>
          <div>
            <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl mb-6">
              🌍
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 font-serif">Connect Globally</h3>
            <p className="text-muted leading-relaxed">Follow other collectors, see what they are adding to their shelves, and engage through likes.</p>
          </div>
          <div>
            <div className="h-12 w-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-2xl mb-6">
              🤖
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 font-serif">AI Powered</h3>
            <p className="text-muted leading-relaxed">Instantly fetch notes, accords, and categorization data for new bottles automatically.</p>
          </div>
        </div>
      </header>

      <footer className="border-t border-border py-8 text-center bg-surface/50 backdrop-blur-sm">
        <p className="text-sm text-muted">
          Built with passion for the fragrance community.
        </p>
      </footer>
    </div>
  )
}
