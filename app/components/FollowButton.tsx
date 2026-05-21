'use client'

import { useState, useTransition } from 'react'
import { toggleFollow } from '@/app/actions/social'

type FollowButtonProps = {
  userId: string
  initialFollowing: boolean
  initialFollowsBack: boolean
  isOwnProfile?: boolean
}

export default function FollowButton({
  userId,
  initialFollowing,
  initialFollowsBack,
  isOwnProfile = false,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()
  const [isHovering, setIsHovering] = useState(false)

  if (isOwnProfile) return null

  const handleClick = () => {
    // Optimistic update
    const prev = isFollowing
    setIsFollowing(!prev)

    startTransition(async () => {
      const result = await toggleFollow(userId)
      if (result.error) {
        // Rollback on error
        setIsFollowing(prev)
      } else {
        setIsFollowing(result.active)
      }
    })
  }

  const getLabel = () => {
    if (isFollowing && isHovering) return 'Unfollow'
    if (isFollowing) return 'Following'
    if (initialFollowsBack) return 'Follow back'
    return 'Follow'
  }

  const getStyles = () => {
    if (isFollowing && isHovering) {
      return 'border-danger/50 bg-danger/10 text-danger hover:bg-danger/20'
    }
    if (isFollowing) {
      return 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20'
    }
    return 'border-accent bg-accent text-background hover:opacity-90'
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      disabled={isPending}
      className={`rounded-full border px-5 py-1.5 text-sm font-medium transition-all duration-200 ${getStyles()} disabled:opacity-70`}
    >
      {getLabel()}
    </button>
  )
}
