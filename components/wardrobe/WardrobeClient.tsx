'use client'

/**
 * components/wardrobe/WardrobeClient.tsx
 * Client shell holding all wardrobe state + phase management.
 */
import { useState } from 'react'
import WardrobeInput from './WardrobeInput'
import WardrobeResult from './WardrobeResult'
import type { RecommendationResult } from '@/app/actions/wardrobe'
import type { UserPicks } from '@/lib/wardrobe/scoring'

export default function WardrobeClient() {
  const [result, setResult] = useState<RecommendationResult | null>(null)
  const [picks] = useState<UserPicks>({})

  if (result) {
    return (
      <WardrobeResult
        result={result}
        picks={picks}
        onReset={() => {
          // Clear caches on Try Again
          try {
            Object.keys(localStorage)
              .filter(k => k.startsWith('wardrobe_rec_'))
              .forEach(k => { try { localStorage.removeItem(k) } catch { /* */ } })
          } catch { /* */ }
          setResult(null)
        }}
      />
    )
  }

  return (
    <WardrobeInput
      onResult={(r) => setResult(r)}
    />
  )
}
