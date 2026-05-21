'use client'

import { useState, useRef, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toggleLike } from '@/app/actions/social'

type LikeButtonProps = {
  fragranceId: string
  initialLiked: boolean
  initialCount: number
}

export default function LikeButton({
  fragranceId,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Optimistic update
    const prevLiked = liked
    const prevCount = count
    setLiked(!prevLiked)
    setCount(prevLiked ? prevCount - 1 : prevCount + 1)

    // Debounce server call
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await toggleLike(fragranceId)
        if (result.error) {
          // Rollback
          setLiked(prevLiked)
          setCount(prevCount)
        }
      })
    }, 300)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 text-sm transition-colors group"
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={liked ? 'liked' : 'not-liked'}
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          className="inline-block"
        >
          {liked ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-danger transition-colors">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
        </motion.span>
      </AnimatePresence>
      <span className={`tabular-nums ${liked ? 'text-danger font-medium' : 'text-muted'}`}>
        {count}
      </span>
    </button>
  )
}
