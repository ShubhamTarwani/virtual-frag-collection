'use client'

import { useActionState } from 'react'
import { signUpWithPassword, type AuthState } from '@/app/actions/auth'
import Link from 'next/link'

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signUpWithPassword,
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
              Join the Community
            </span>
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-serif">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-muted">
            Enter your details to sign up
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

          {state?.success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-3xl">
                ✉️
              </div>
              <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
                {state.success}
              </div>
              <p className="text-xs text-muted">
                Click the link in your email to complete sign up.
                <br />
                You can close this tab.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-border-light bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-foreground mb-1.5 mt-4">
                  Password
                </label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-border-light bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-accent"
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="flex items-start pt-2">
                <input
                  id="signup-agree"
                  name="agree"
                  type="checkbox"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-border-light bg-surface text-accent focus:ring-accent focus:ring-offset-background"
                />
                <label htmlFor="signup-agree" className="ml-2 block text-xs text-muted">
                  I agree to the{' '}
                  <Link href="/terms" className="text-accent hover:underline" target="_blank">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-accent hover:underline" target="_blank">Privacy Policy</Link>.
                </label>
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full mt-6 rounded-2xl bg-accent px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? 'Creating Account…' : 'Create Account'}
              </button>
            </>
          )}
        </form>

        {/* Footer links */}
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
