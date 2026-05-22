'use client'

/**
 * components/wardrobe/WardrobeResult.tsx
 * The result phase: primary hero card + alternatives + avoid.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RecommendationResult } from '@/app/actions/wardrobe'
import type { UserPicks } from '@/lib/wardrobe/scoring'
import SmartImage from '@/components/ui/SmartImage'
import WearLogModal from './WearLogModal'

type Props = {
  result: RecommendationResult
  picks: UserPicks
  onReset: () => void
}

function BottleCard({
  bottle,
  reason,
  size = 'sm',
}: {
  bottle: { id: string; name: string | null; brand: string | null; image_url: string | null }
  reason: string
  size?: 'sm' | 'lg'
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div
        className="rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-hover)] shrink-0 flex items-center justify-center"
        style={{ width: size === 'lg' ? 80 : 56, height: size === 'lg' ? 80 : 56 }}
      >
        {bottle.image_url ? (
          <SmartImage
            src={bottle.image_url}
            alt={bottle.name ?? ''}
            width={size === 'lg' ? 80 : 56}
            height={size === 'lg' ? 80 : 56}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-2xl">🧴</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-serif font-bold text-[var(--foreground)] text-sm leading-tight truncate">{bottle.name ?? 'Unknown'}</p>
        <p className="text-xs text-[var(--muted)] mb-1">{bottle.brand}</p>
        <p className="text-xs text-[var(--muted)] leading-snug line-clamp-2">{reason}</p>
      </div>
    </div>
  )
}

export default function WardrobeResult({ result, picks, onReset }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [showReasons, setShowReasons] = useState(false)
  const [showAvoid, setShowAvoid] = useState(false)

  const { context, recommendation, top5 } = result

  // Resolve bottles from top5 by id
  const bottleById = Object.fromEntries(top5.map(sb => [sb.bottle.id, sb.bottle]))
  const scoredById = Object.fromEntries(top5.map(sb => [sb.bottle.id, sb]))

  const primary = bottleById[recommendation.primary.bottle_id]
  const primaryScored = scoredById[recommendation.primary.bottle_id]
  const alternatives = recommendation.alternatives
    .map(a => ({ bottle: bottleById[a.bottle_id], reason: a.reason }))
    .filter(a => a.bottle)
  const avoid = recommendation.avoid_today
  const avoidBottle = bottleById[avoid.bottle_id]

  if (!primary) return null

  const handleShare = async () => {
    const text = `Wearing ${primary.name} by ${primary.brand} today 🧴`
    if (navigator.share) {
      await navigator.share({ title: 'My fragrance today', text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-bold text-[var(--foreground)]">Your pick for today</h2>
        <button
          onClick={onReset}
          id="wardrobe-reset-btn"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ↻ Try again
        </button>
      </div>

      {/* HERO card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden mb-5 gold-glow"
      >
        {/* Image */}
        <div className="w-full flex justify-center items-center py-8 px-4 bg-[var(--surface-hover)]" style={{ minHeight: 220 }}>
          {primary.image_url ? (
            <SmartImage
              src={primary.image_url}
              alt={primary.name ?? ''}
              width={200}
              height={200}
              className="object-contain"
              style={{ maxHeight: 200 }}
              priority
            />
          ) : (
            <span className="text-7xl">🧴</span>
          )}
        </div>

        {/* Info */}
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-1">{primary.brand}</p>
          <h3 className="font-serif text-2xl font-bold text-[var(--foreground)] mb-3">{primary.name}</h3>
          <p className="text-[var(--muted)] text-sm leading-relaxed italic mb-4">
            &ldquo;{recommendation.primary.reason}&rdquo;
          </p>

          {/* Expandable scoring reasons */}
          {primaryScored && (
            <button
              onClick={() => setShowReasons(v => !v)}
              className="text-xs text-[var(--accent)] hover:underline mb-3 block"
            >
              {showReasons ? '▲ Hide details' : '▼ Why this one?'}
            </button>
          )}
          <AnimatePresence>
            {showReasons && primaryScored && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-[var(--surface-hover)] rounded-xl p-3 mb-3 space-y-1">
                  {primaryScored.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-[var(--muted)] font-mono">{r}</p>
                  ))}
                  <p className="text-xs font-bold text-[var(--foreground)] pt-1 border-t border-[var(--border)] mt-1">
                    Total score: {primaryScored.score}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky CTA bar */}
          <div className="flex gap-2 mt-1">
            <button
              id="wear-this-btn"
              onClick={() => setShowModal(true)}
              className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
              style={{ background: 'var(--accent)', color: 'var(--background)' }}
            >
              ✓ Wearing this today
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-3 rounded-2xl text-sm border border-[var(--border-light)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)] transition-all"
              title="Share"
            >
              ↗
            </button>
          </div>
        </div>
      </motion.div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Also consider</p>
          <div className="flex gap-3 overflow-x-auto pb-2 sm:flex-col sm:overflow-x-visible">
            {alternatives.map((alt, i) => (
              <motion.div
                key={alt.bottle.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="min-w-[280px] sm:min-w-0"
              >
                <BottleCard bottle={alt.bottle} reason={alt.reason} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Avoid today */}
      {avoidBottle && (
        <div>
          <button
            onClick={() => setShowAvoid(v => !v)}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-2"
          >
            {showAvoid ? '▲ Hide' : '▼ Maybe skip today'}
          </button>
          <AnimatePresence>
            {showAvoid && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-red-800/40 bg-red-950/10 p-1">
                  <BottleCard bottle={avoidBottle} reason={avoid.reason} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Wear Log Modal */}
      {showModal && (
        <WearLogModal
          bottle={primary}
          context={context}
          initialPicks={picks}
          onClose={() => setShowModal(false)}
          onLogged={() => {
            // Clear cache entry so next visit is fresh
            try {
              Object.keys(localStorage).filter(k => k.startsWith('wardrobe_rec_')).forEach(k => {
                try { localStorage.removeItem(k) } catch { /* */ }
              })
            } catch { /* */ }
          }}
        />
      )}
    </div>
  )
}
