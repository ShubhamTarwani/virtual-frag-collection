import Link from 'next/link'
import { getCurrentProfile } from '@/lib/supabase/queries'
import { hasNewNotifications } from '@/lib/supabase/social-queries'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import NotificationDot from './NotificationDot'
import SignOutButton from './SignOutButton'
import UserSearchBar from './UserSearchBar'
import MobileMenu from './MobileMenu'

export default async function NavBar() {
  const profile = await getCurrentProfile()
  const hasNew = profile ? await hasNewNotifications() : false
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === process.env.ADMIN_EMAIL

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Logo */}
        <Link href="/" className="text-sm font-bold tracking-tight text-foreground font-serif hover:text-accent transition-colors shrink-0">
          Fragrance Shelf
        </Link>

        {/* Search bar — hidden on mobile (shown in MobileMenu) */}
        <div className="hidden sm:block flex-1 max-w-xs mx-4">
          <UserSearchBar />
        </div>

        {/* Desktop nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <Link
            href="/discover"
            className="px-3 py-1.5 rounded-full text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            Discover
          </Link>

          {profile ? (
            <>
              <Link
                href="/feed"
                className="px-3 py-1.5 rounded-full text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                Feed
              </Link>

              <Link
                href="/wardrobe"
                className="px-3 py-1.5 rounded-full text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                🧴 Wardrobe
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-accent hover:bg-surface-hover transition-colors flex items-center gap-1"
                >
                  Admin ⚙
                </Link>
              )}

              <NotificationDot hasNew={hasNew} />

              <Link
                href={`/u/${profile.username}`}
                className="ml-1 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover border border-border-light"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent">
                    {(profile.display_name || profile.username)[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline">{profile.display_name || profile.username}</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-background transition hover:opacity-90"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile hamburger menu */}
        <MobileMenu
          profile={profile ? { username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url } : null}
          isAdmin={isAdmin}
          hasNew={hasNew}
        />
      </div>
    </nav>
  )
}
