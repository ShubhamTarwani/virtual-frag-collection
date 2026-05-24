'use client'

import { useState, useActionState, useEffect } from 'react'
import { updateBio } from '@/app/actions/auth'

type Props = {
  initialBio: string | null
}

export default function BioEditor({ initialBio }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [bioText, setBioText] = useState(initialBio || '')
  
  const [state, formAction, isPending] = useActionState(updateBio, undefined)

  // Exit edit mode on success
  useEffect(() => {
    if (state?.success) {
      // eslint-disable-next-line
      setIsEditing(false)
    }
  }, [state?.success])

  if (!isEditing) {
    return (
      <div className="mt-2 group relative max-w-lg">
        {bioText ? (
          <p className="text-sm text-foreground/80">{bioText}</p>
        ) : (
          <p className="text-sm text-muted italic">No bio provided.</p>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 text-xs text-muted hover:text-foreground transition-opacity"
          aria-label="Edit bio"
        >
          ✏️
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2 max-w-lg">
      <form action={formAction} className="flex flex-col gap-2">
        <textarea
          name="bio"
          value={bioText}
          onChange={(e) => setBioText(e.target.value)}
          maxLength={280}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-surface p-3 text-sm text-foreground focus:border-accent focus:outline-none"
          placeholder="Tell us about your fragrance journey..."
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {bioText.length}/280
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setBioText(initialBio || '')
              }}
              className="px-3 py-1 text-xs text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent)] text-[var(--background)] disabled:opacity-50 transition-opacity"
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        {state?.error && (
          <p className="text-xs text-[var(--danger)]">{state.error}</p>
        )}
      </form>
    </div>
  )
}
