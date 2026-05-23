import React from 'react'
import { Crown, Gem, Trophy, Star } from 'lucide-react'

type BadgeSize = 'sm' | 'md' | 'lg'

interface AccountNumberBadgeProps {
  number: number
  size?: BadgeSize
  className?: string
}

export default function AccountNumberBadge({ number, size = 'md', className = '' }: AccountNumberBadgeProps) {
  // Format number to at least 4 digits
  const paddedNumber = `#${number.toString().padStart(4, '0')}`

  // Define sizes
  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 text-[10px]',
      icon: 'w-3 h-3',
      label: 'text-[8px]'
    },
    md: {
      container: 'px-3 py-1 text-xs',
      icon: 'w-3.5 h-3.5',
      label: 'text-[9px]'
    },
    lg: {
      container: 'px-4 py-1.5 text-sm',
      icon: 'w-4 h-4',
      label: 'text-[10px]'
    }
  }

  const s = sizeClasses[size]

  // Tier logic
  if (number === 0) {
    return (
      <div className={`inline-flex flex-col items-center justify-center rounded-lg border shadow-sm ${s.container} bg-[#c8a855]/10 border-[#c8a855]/40 text-[#c8a855] shimmer-gold ${className}`}>
        {size !== 'sm' && <span className={`font-bold tracking-widest uppercase mb-0.5 ${s.label}`}>Founder</span>}
        <div className="flex items-center gap-1.5 font-bold tracking-wider font-mono">
          <Crown className={s.icon} />
          {paddedNumber}
        </div>
      </div>
    )
  }

  if (number >= 1 && number <= 20) {
    return (
      <div className={`inline-flex flex-col items-center justify-center rounded-lg border shadow-sm ${s.container} bg-[#e0e0e0]/10 border-[#e0e0e0]/30 text-[#e0e0e0] shimmer-silver ${className}`}>
        {size !== 'sm' && <span className={`font-bold tracking-widest uppercase mb-0.5 opacity-80 ${s.label}`}>Reserved</span>}
        <div className="flex items-center gap-1.5 font-bold tracking-wider font-mono">
          <Gem className={s.icon} />
          {paddedNumber}
        </div>
      </div>
    )
  }

  if (number >= 21 && number <= 100) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-lg border shadow-[0_0_8px_rgba(200,168,85,0.15)] ${s.container} bg-gradient-to-r from-[#c8a855]/10 to-[#b89542]/5 border-[#c8a855]/30 text-[#d4b563] ${className}`}>
        <Trophy className={s.icon} />
        <span className="font-bold tracking-wider font-mono">{paddedNumber}</span>
      </div>
    )
  }

  if (number >= 101 && number <= 500) {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-lg border shadow-sm ${s.container} bg-[#c8a855]/5 border-[#c8a855]/20 text-[#c8a855]/80 ${className}`}>
        <Star className={s.icon} />
        <span className="font-semibold tracking-wider font-mono">{paddedNumber}</span>
      </div>
    )
  }

  // Collector (501+)
  return (
    <div className={`inline-flex items-center rounded-lg border shadow-sm ${s.container} bg-surface border-border-light text-muted ${className}`}>
      <span className="font-medium tracking-wider font-mono">{paddedNumber}</span>
    </div>
  )
}
