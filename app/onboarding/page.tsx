'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { completeOnboarding, checkUsernameAvailable, type AuthState } from '@/app/actions/auth'

export default function OnboardingPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    completeOnboarding,
    undefined
  )

  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean
    available?: boolean
    error?: string
  }>({ checking: false })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced username availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (username.length < 3) {
      setUsernameStatus({ checking: false })
      return
    }

    setUsernameStatus({ checking: true })

    debounceRef.current = setTimeout(async () => {
      const result = await checkUsernameAvailable(username)
      setUsernameStatus({
        checking: false,
        available: result.available,
        error: result.error,
      })
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">
              Almost There
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">
            Set Up Your Profile
          </h1>
          <p className="mt-2 text-sm text-muted">
            Choose a username and tell us about yourself
          </p>
        </div>

        {/* Form */}
        <form
          action={action}
          className="space-y-5 rounded-2xl border border-border bg-surface/90 p-6 shadow-sm"
        >
          {state?.error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {state.error}
            </div>
          )}

          {/* Username */}
          <div>
            <label htmlFor="onboard-username" className="block text-sm font-medium text-foreground mb-1.5">
              Username <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
              <input
                id="onboard-username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9_]+"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full rounded-2xl border border-border-light bg-surface pl-9 pr-10 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
                placeholder="your_username"
              />
              {/* Status indicator */}
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm">
                {usernameStatus.checking && (
                  <svg className="animate-spin h-4 w-4 text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {!usernameStatus.checking && username.length >= 3 && usernameStatus.available === true && (
                  <span className="text-green-500">✓</span>
                )}
                {!usernameStatus.checking && username.length >= 3 && usernameStatus.available === false && (
                  <span className="text-danger">✗</span>
                )}
              </span>
            </div>
            {usernameStatus.error && (
              <p className="mt-1.5 text-xs text-danger">{usernameStatus.error}</p>
            )}
            {!usernameStatus.checking && username.length >= 3 && usernameStatus.available === true && (
              <p className="mt-1.5 text-xs text-green-500">Username is available!</p>
            )}
            <p className="mt-1.5 text-xs text-muted">3–20 characters. Lowercase letters, numbers, underscores.</p>
          </div>

          {/* Display name */}
          <div>
            <label htmlFor="onboard-display-name" className="block text-sm font-medium text-foreground mb-1.5">
              Display Name
            </label>
            <input
              id="onboard-display-name"
              name="display_name"
              type="text"
              maxLength={50}
              className="w-full rounded-2xl border border-border-light bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
              placeholder="How you'd like to be called"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="onboard-bio" className="block text-sm font-medium text-foreground mb-1.5">
              Bio
            </label>
            <textarea
              id="onboard-bio"
              name="bio"
              maxLength={280}
              rows={3}
              className="w-full rounded-2xl border border-border-light bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent resize-none"
              placeholder="Tell us about your fragrance journey… (max 280 chars)"
            />
          </div>

          <button
            type="submit"
            disabled={pending || (username.length >= 3 && !usernameStatus.available)}
            className="w-full rounded-2xl bg-accent px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
