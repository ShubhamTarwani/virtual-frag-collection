'use client'

/**
 * components/wardrobe/WardrobeInput.tsx
 * The input phase: context card + pill rows + loading state.
 */
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getRecommendation } from '@/app/actions/wardrobe'
import type { RecommendationResult } from '@/app/actions/wardrobe'
import type { UserPicks } from '@/lib/wardrobe/scoring'
import ContextCard from './ContextCard'
import GeolocationPrompt from './GeolocationPrompt'
import PillSelector from './PillSelector'
import type { AutoContext } from '@/lib/wardrobe/context'

const LOADING_MESSAGES = [
  'Reading the day\'s weather…',
  'Looking at your shelf…',
  'Asking your AI nose…',
  'Weighing your options…',
  'Almost ready…',
]

const OCCASION_OPTIONS = [
  { value: 'office', label: 'Office', icon: '💼' },
  { value: 'casual', label: 'Casual', icon: '👕' },
  { value: 'date', label: 'Date', icon: '🌹' },
  { value: 'formal', label: 'Formal', icon: '🎩' },
  { value: 'outdoor', label: 'Outdoor', icon: '🌿' },
  { value: 'night', label: 'Night out', icon: '🌙' },
]
const WHO_OPTIONS = [
  { value: 'solo', label: 'Solo', icon: '🙋' },
  { value: 'friends', label: 'Friends', icon: '👯' },
  { value: 'colleagues', label: 'Colleagues', icon: '🤝' },
  { value: 'partner', label: 'Partner', icon: '💑' },
  { value: 'family', label: 'Family', icon: '🏠' },
]
const SETTING_OPTIONS = [
  { value: 'small_indoor', label: 'Small indoor', icon: '🏠' },
  { value: 'large_indoor', label: 'Large indoor', icon: '🏢' },
  { value: 'outdoor', label: 'Outdoor', icon: '🌳' },
  { value: 'commute', label: 'Commute', icon: '🚇' },
]
const MOOD_OPTIONS = [
  { value: 'energised', label: 'Energised', icon: '⚡' },
  { value: 'relaxed', label: 'Relaxed', icon: '☁️' },
  { value: 'confident', label: 'Confident', icon: '🔥' },
  { value: 'romantic', label: 'Romantic', icon: '✨' },
  { value: 'subtle', label: 'Subtle', icon: '🌸' },
]

// Cache key builder
function buildCacheKey(context: AutoContext | null, picks: UserPicks): string {
  const temp = context?.temp !== null ? Math.round(context?.temp ?? 0) : 'x'
  const humid = context?.humidity !== null
    ? (context!.humidity! > 60 ? 'humid' : 'dry')
    : 'x'
  const parts = [
    temp, humid,
    context?.condition ?? 'x',
    context?.timeOfDay ?? 'x',
    context?.season ?? 'x',
    picks.occasion ?? 'any',
    picks.whoWith ?? 'any',
    picks.setting ?? 'any',
    picks.mood ?? 'any',
  ]
  return `wardrobe_rec_${parts.join('_')}`
}

type CacheEntry = { result: RecommendationResult; ts: number }

function readCache(key: string): RecommendationResult | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > 3 * 60 * 60 * 1000) return null // 3h TTL
    return entry.result
  } catch { return null }
}

function writeCache(key: string, result: RecommendationResult) {
  try { localStorage.setItem(key, JSON.stringify({ result, ts: Date.now() })) }
  catch { /* storage full */ }
}

type Props = {
  onResult: (result: RecommendationResult) => void
}

export default function WardrobeInput({ onResult }: Props) {
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null)
  const [context, setContext] = useState<AutoContext | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [picks, setPicks] = useState<UserPicks>({})
  const [msgIdx, setMsgIdx] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleGeoResolved = async (result: { lat: number; lon: number; label?: string }) => {
    setGeo(result)
    setContextLoading(true)
    try {
      const res = await fetch('/api/wardrobe/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: result.lat, lon: result.lon }),
      })
      if (res.ok) {
        const ctx: AutoContext = await res.json()
        setContext(ctx)
      }
    } catch { /* context load failed — carry on */ }
    setContextLoading(false)
  }

  const handleRefreshLocation = () => {
    try { localStorage.removeItem('wardrobe_geo') } catch { /* */ }
    setGeo(null)
    setContext(null)
  }

  const handleSubmit = () => {
    setError(null)
    // Check localStorage cache first
    const cacheKey = buildCacheKey(context, picks)
    const cached = readCache(cacheKey)
    if (cached) {
      onResult(cached)
      return
    }

    // Cycle loading messages
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length
      setMsgIdx(i)
    }, 1400)

    startTransition(async () => {
      const result = await getRecommendation(picks, geo?.lat, geo?.lon)
      clearInterval(interval)
      if ('error' in result) {
        setError(result.error)
      } else {
        writeCache(cacheKey, result)
        onResult(result)
      }
    })
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl font-bold text-[var(--foreground)] mb-1">
        What should I wear today?
      </h1>
      <p className="text-[var(--muted)] text-sm mb-6">
        Your AI fragrance concierge — picks the right bottle for this exact moment.
      </p>

      <GeolocationPrompt onResolved={handleGeoResolved} />

      <ContextCard context={context} loading={contextLoading} onRefresh={handleRefreshLocation} />

      <div className="mb-6">
        <PillSelector label="Occasion" options={OCCASION_OPTIONS} value={picks.occasion} onChange={(v) => setPicks(p => ({ ...p, occasion: v }))} />
        <PillSelector label="Who with" options={WHO_OPTIONS} value={picks.whoWith} onChange={(v) => setPicks(p => ({ ...p, whoWith: v }))} />
        <PillSelector label="Setting" options={SETTING_OPTIONS} value={picks.setting} onChange={(v) => setPicks(p => ({ ...p, setting: v }))} />
        <PillSelector label="Mood" options={MOOD_OPTIONS} value={picks.mood} onChange={(v) => setPicks(p => ({ ...p, mood: v }))} />
      </div>

      <button
        onClick={() => setPicks({})}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline mb-5 block transition-colors"
      >
        Skip → just use weather
      </button>

      {error && (
        <div className="rounded-xl border border-[var(--danger)] bg-red-950/20 text-[var(--danger)] text-sm p-3 mb-4">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {isPending ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Skeleton cards */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-card" style={{ height: 100 }}>
                <div className="flex gap-3 p-4">
                  <div className="skeleton-img rounded-xl" style={{ width: 72, height: 72 }} />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="skeleton-text" style={{ width: '60%' }} />
                    <div className="skeleton-text" style={{ width: '40%' }} />
                  </div>
                </div>
              </div>
            ))}
            <p className="text-center text-sm text-[var(--muted)] animate-pulse">
              {LOADING_MESSAGES[msgIdx]}
            </p>
          </motion.div>
        ) : (
          <motion.button
            key="cta"
            id="wardrobe-find-btn"
            onClick={handleSubmit}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="w-full py-4 rounded-2xl text-base font-bold tracking-wide transition-all shadow-lg"
            style={{ background: 'var(--accent)', color: 'var(--background)' }}
          >
            Find My Fragrance →
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
