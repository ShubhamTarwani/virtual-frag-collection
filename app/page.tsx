import Link from 'next/link'
import Image from 'next/image'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { getMostFollowedCollectors } from '@/lib/supabase/social-queries'
import ScrollReveal from '@/components/ui/ScrollReveal'
import { Library, Sparkles, Users } from 'lucide-react'
import HeroParticles from '@/components/ui/HeroParticles'

export const revalidate = 60;

export default async function Home() {
  const profile = await getCurrentProfile()
  const topCollectors = profile ? [] : await getMostFollowedCollectors(4)

  return (
    <div className="flex flex-col flex-1 bg-background font-sans relative overflow-x-hidden">
      {/* Background decorations */}
      <HeroParticles />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-full max-w-3xl h-[400px] bg-accent/5 blur-[100px] rounded-tl-full pointer-events-none z-0" />

      {/* Hero Section */}
      <header className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24 sm:py-32 min-h-[80vh] overflow-visible w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          <p className="text-[10px] sm:text-xs font-semibold tracking-[0.3em] uppercase text-accent">
            The Community for Collectors
          </p>
          <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
        </div>
        
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-foreground font-serif leading-[1.1] max-w-4xl mx-auto overflow-visible px-2">
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
              className="w-full sm:w-auto rounded-[50px] bg-[#c8a855] px-[2rem] py-[0.75rem] text-base font-medium text-black transition-all hover:bg-[#c8a855]/90 hover:scale-105 shadow-lg shadow-accent/20"
            >
              View Your Shelf
            </Link>
          ) : (
            <Link 
              href="/signup"
              className="w-full sm:w-auto rounded-[50px] bg-[#c8a855] px-[2rem] py-[0.75rem] text-base font-medium text-black transition-all hover:bg-[#c8a855]/90 hover:scale-105 shadow-lg shadow-accent/20"
            >
              Start Your Collection
            </Link>
          )}
          
          <Link 
            href="/discover"
            className="w-full sm:w-auto rounded-[50px] bg-transparent border border-[#c8a855]/30 px-[2rem] py-[0.75rem] text-base font-medium text-foreground transition-all hover:bg-surface-hover hover:border-[#c8a855]/50"
          >
            Explore Community
          </Link>
        </div>

        {/* Popular Collectors (Logged out only) */}
        {!profile && topCollectors.length > 0 && (
          <ScrollReveal className="mt-24 w-full max-w-5xl mx-auto border-t border-border pt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground font-serif">Popular Collectors</h2>
              <Link href="/discover" className="text-sm text-accent hover:underline">View all →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              {topCollectors.map((c) => (
                <Link key={c.id} href={`/u/${c.username}`} className="group rounded-2xl border border-border bg-surface p-5 hover:border-accent/50 transition-colors">
                  <div className="h-16 w-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-xl font-bold text-accent mb-4 overflow-hidden relative">
                    {c.avatar_url ? <Image src={c.avatar_url} alt="" fill priority unoptimized className="object-cover" /> : (c.display_name || c.username)[0].toUpperCase()}
                  </div>
                  <div className="text-base font-semibold text-foreground truncate group-hover:text-accent transition-colors">{c.display_name || c.username}</div>
                  <div className="text-sm text-muted">@{c.username}</div>
                  <div className="text-xs font-medium text-accent mt-2">{c.follower_count} followers</div>
                </Link>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Feature Highlights */}
        <ScrollReveal className="mt-24 grid grid-cols-1 sm:grid-cols-3 w-full max-w-5xl mx-auto border-t border-border pt-16">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left px-8 py-4">
            <div className="text-accent mb-4">
              <Library size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 font-serif">Your Collection</h3>
            <p className="text-sm text-muted leading-relaxed">Catalogue bottles with notes and wear history.</p>
          </div>
          
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left px-8 py-4 sm:border-x sm:border-[#c8a855]/20 border-y sm:border-y-0 border-[#c8a855]/20 my-8 sm:my-0">
            <div className="text-accent mb-4">
              <Sparkles size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 font-serif">AI Wardrobe</h3>
            <p className="text-sm text-muted leading-relaxed">Weather and mood based recommendations.</p>
          </div>
          
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left px-8 py-4">
            <div className="text-accent mb-4">
              <Users size={28} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2 font-serif">Community</h3>
            <p className="text-sm text-muted leading-relaxed">Follow collectors and discover rare bottles.</p>
          </div>
        </ScrollReveal>
      </header>

      <footer className="border-t border-border py-8 text-center bg-surface/50 backdrop-blur-sm">
        <p className="text-sm text-muted">
          Built with passion for the fragrance community.
        </p>
      </footer>
    </div>
  )
}
