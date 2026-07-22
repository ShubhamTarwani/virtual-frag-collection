"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SignOutButton from './SignOutButton'
import UserSearchBar from './UserSearchBar'

type Profile = {
  username: string
  display_name: string | null
  avatar_url: string | null
}

type Props = {
  profile: Profile | null
  isAdmin: boolean
  hasNew: boolean
}

export default function MobileMenu({ profile, isAdmin, hasNew }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close menu on route change
  useEffect(() => { setIsOpen(false) }, [pathname])

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        className="flex md:hidden items-center justify-center w-10 h-10 rounded-full border border-border-light text-muted hover:text-foreground active:bg-surface-hover transition-colors shrink-0"
      >
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-down menu panel */}
          <div className="fixed top-14 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-md shadow-xl">
            {/* Mobile search */}
            <div className="px-4 py-3 border-b border-border/50">
              <UserSearchBar />
            </div>

            {/* Nav links */}
            <nav className="flex flex-col p-2">
              <Link
                href="/discover"
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base text-muted hover:text-foreground hover:bg-surface-hover active:bg-surface-hover transition-colors"
              >
                🔍 <span>Discover</span>
              </Link>

              {profile ? (
                <>
                  <Link
                    href="/feed"
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base text-muted hover:text-foreground hover:bg-surface-hover active:bg-surface-hover transition-colors"
                  >
                    📰 <span>Feed</span>
                    {hasNew && <span className="ml-auto w-2 h-2 rounded-full bg-accent" />}
                  </Link>

                  <Link
                    href="/wardrobe"
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base text-muted hover:text-foreground hover:bg-surface-hover active:bg-surface-hover transition-colors"
                  >
                    🧴 <span>Wardrobe</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium text-accent hover:bg-surface-hover active:bg-surface-hover transition-colors"
                    >
                      ⚙️ <span>Admin</span>
                    </Link>
                  )}

                  <Link
                    href={`/u/${profile.username}`}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base text-muted hover:text-foreground hover:bg-surface-hover active:bg-surface-hover transition-colors"
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border border-border-light shrink-0" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                        {(profile.display_name || profile.username)[0].toUpperCase()}
                      </div>
                    )}
                    <span>{profile.display_name || profile.username}</span>
                  </Link>

                  <div className="px-2 py-1">
                    <SignOutButton />
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  className="mx-2 my-1 rounded-full bg-accent px-4 py-3.5 text-base font-medium text-background text-center transition hover:opacity-90 active:opacity-80"
                >
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  )
}
