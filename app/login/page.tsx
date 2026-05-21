'use client'

import { useActionState } from 'react'
import { signInWithPassword, type AuthState } from '@/app/actions/auth'
import Link from 'next/link'

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signInWithPassword,
    undefined
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
            <span className="text-xs font-semibold tracking-[0.3em] uppercase text-accent">
              Welcome Back
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">
            Sign In
          </h1>
          <p className="mt-2 text-sm text-muted">
            Access your fragrance collection
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

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-border-light bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-foreground mb-1.5">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-border-light bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-accent px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Footer links */}
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
