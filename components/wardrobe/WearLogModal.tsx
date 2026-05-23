'use client'

/**
 * components/wardrobe/WearLogModal.tsx
 * Confirm selected bottle + log the wear entry.
 */
import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { logWear } from '@/app/actions/wardrobe'
import type { UserPicks } from '@/lib/wardrobe/scoring'
import type { AutoContext } from '@/lib/wardrobe/context'
import PillSelector from './PillSelector'
import SmartImage from '@/components/ui/SmartImage'

type Props = {
  bottle: { id: string; name: string | null; brand: string | null; image_url: string | null }
  context: AutoContext
  initialPicks: UserPicks
  onClose: () => void
  onLogged: () => void
}

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

export default function WearLogModal({ bottle, context, initialPicks, onClose, onLogged }: Props) {
  const [picks, setPicks] = useState<UserPicks>(initialPicks)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await logWear({
        bottleId: bottle.id,
        occasion: picks.occasion,
        whoWith: picks.whoWith,
        setting: picks.setting,
        mood: picks.mood,
        weatherTemp: context.temp,
        weatherHumidity: context.humidity,
        weatherCondition: context.condition,
        season: context.season,
        timeOfDay: context.timeOfDay,
        source: 'wardrobe_ai',
      })
      if (!result.success) {
        setError(result.error ?? 'Something went wrong')
        return
      }
      setToast(true)
      setTimeout(() => {
        onLogged()
        onClose()
      }, 1600)
    })
  }

  return (
    <AnimatePresence>
      <motion.div
        key="modal-overlay"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        >
          <AnimatePresence>
            {toast ? (
              <motion.div
                key="toast"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <p className="text-4xl mb-3">✨</p>
                <p className="font-semibold text-[var(--foreground)] text-lg">Logged!</p>
                <p className="text-[var(--muted)] text-sm mt-1">Have a great day.</p>
              </motion.div>
            ) : (
              <motion.div key="form">
                {/* Bottle preview */}
                <div className="flex items-center gap-4 mb-5" data-fragrance-card={true}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-hover)] shrink-0 flex items-center justify-center">
                    {bottle.image_url ? (
                      <SmartImage src={bottle.image_url} alt={bottle.name ?? ''} width={64} height={64} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl">🧴</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)] font-serif">{bottle.name}</p>
                    <p className="text-xs text-[var(--muted)]">{bottle.brand}</p>
                  </div>
                </div>

                <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Confirm details</p>

                <PillSelector label="Occasion" options={OCCASION_OPTIONS} value={picks.occasion} onChange={(v) => setPicks(p => ({ ...p, occasion: v }))} />
                <PillSelector label="Who with" options={WHO_OPTIONS} value={picks.whoWith} onChange={(v) => setPicks(p => ({ ...p, whoWith: v }))} />

                {error && <p className="text-xs text-[var(--danger)] mb-3">{error}</p>}

                <button
                  id="wear-log-confirm-btn"
                  onClick={handleConfirm}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--background)' }}
                >
                  {isPending ? 'Logging…' : '✓ Wearing this today'}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mt-2"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
