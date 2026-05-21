'use client'

import { useEffect, useState, useTransition } from 'react'
import { markNotificationsSeen } from '@/app/actions/social'

type NotificationDotProps = {
  hasNew: boolean
}

export default function NotificationDot({ hasNew }: NotificationDotProps) {
  const [showDot, setShowDot] = useState(hasNew)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setShowDot(hasNew)
  }, [hasNew])

  const handleClick = () => {
    setShowDot(false)
    startTransition(async () => {
      await markNotificationsSeen()
    })
  }

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-full hover:bg-surface-hover transition-colors"
      aria-label="Notifications"
    >
      {/* Bell icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* Notification dot */}
      {showDot && (
        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-danger" />
        </span>
      )}
    </button>
  )
}
