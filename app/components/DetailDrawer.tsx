"use client"

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Perfume } from './PerfumeShelf'
import { BottleImage } from '@/components/ui/BottleImage'

type Props = {
  perfume: Perfume | null
  onClose: () => void
}

const seasonData: Record<string, { icon: string; label: string }> = {
  Spring: { icon: '🌸', label: 'Spring' },
  Summer: { icon: '☀️', label: 'Summer' },
  Fall: { icon: '🍂', label: 'Fall' },
  Winter: { icon: '❄️', label: 'Winter' },
}

function parseNotes(notesStr: string | undefined): { top: string[]; heart: string[]; base: string[] } {
  if (!notesStr) return { top: [], heart: [], base: [] }

  const result: { top: string[]; heart: string[]; base: string[] } = { top: [], heart: [], base: [] }
  const text = notesStr

  // Try to parse structured notes like "Top: X, Y. Heart: A, B. Base: C, D"
  const topMatch = text.match(/top[:\s]+([^.]+)/i)
  const heartMatch = text.match(/(?:heart|middle)[:\s]+([^.]+)/i)
  const baseMatch = text.match(/base[:\s]+([^.]+)/i)

  if (topMatch) result.top = topMatch[1].split(',').map(s => s.trim()).filter(Boolean)
  if (heartMatch) result.heart = heartMatch[1].split(',').map(s => s.trim()).filter(Boolean)
  if (baseMatch) result.base = baseMatch[1].split(',').map(s => s.trim()).filter(Boolean)

  // If no structured notes found, treat the whole string as unstructured
  if (result.top.length === 0 && result.heart.length === 0 && result.base.length === 0) {
    result.top = text.split(',').map(s => s.trim()).filter(Boolean)
  }

  return result
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rating)
        const half = !filled && star === Math.ceil(rating) && rating % 1 >= 0.3
        return (
          <svg
            key={star}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            className={filled || half ? 'star-filled' : 'star-empty'}
            fill={filled ? 'currentColor' : half ? 'url(#half-star)' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {half && (
              <defs>
                <linearGradient id="half-star">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            )}
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        )
      })}
      <span className="text-sm font-semibold text-foreground ml-1">{rating}</span>
    </div>
  )
}

function LongevityBar({ hours }: { hours: number }) {
  const maxHours = 14
  const pct = Math.min((hours / maxHours) * 100, 100)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-foreground">{hours}h</span>
        <span className="text-xs text-muted">/ {maxHours}h max</span>
      </div>
      <div className="longevity-track">
        <motion.div
          className="longevity-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
    </div>
  )
}

function SeasonIcons({ activeSeason }: { activeSeason: string | undefined }) {
  const seasons = ['Spring', 'Summer', 'Fall', 'Winter']
  return (
    <div className="flex gap-2">
      {seasons.map((s) => {
        const data = seasonData[s]
        const isActive = activeSeason?.toLowerCase() === s.toLowerCase()
        return (
          <div
            key={s}
            className={`season-icon ${isActive ? 'active' : ''}`}
            title={data.label}
          >
            {data.icon}
          </div>
        )
      })}
    </div>
  )
}

export default function DetailDrawer({ perfume, onClose }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport (SSR-safe: starts false, set on mount)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Swipe-down-to-dismiss (mobile bottom sheet)
  useEffect(() => {
    const el = drawerRef.current
    if (!el) return
    let startY = 0
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const onEnd = (e: TouchEvent) => {
      if (e.changedTouches[0].clientY - startY > 80) onClose()
    }
    el.addEventListener('touchstart', onStart)
    el.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onClose])

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (perfume) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [perfume, onClose])

  const notes = perfume ? parseNotes(perfume.notes) : { top: [], heart: [], base: [] }

  return (
    <AnimatePresence>
      {perfume && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            className="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Panel — right drawer on desktop, bottom sheet on mobile */}
          <motion.div
            ref={drawerRef}
            className="drawer-panel"
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Drag handle — visible on mobile only */}
            <div className="drawer-handle md:hidden" aria-hidden="true" />
            {/* Close button */}
            <button className="drawer-close" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Hero image */}
            {perfume.cloudinary_public_id || perfume.image_url ? (
              <BottleImage
                publicId={perfume.cloudinary_public_id || perfume.image_url || ''}
                alt={perfume.name || 'Perfume'}
                width={800}
                height={800}
                className="drawer-hero-img object-contain"
              />
            ) : (
              <div className="drawer-hero-img flex items-center justify-center">
                <div className="text-6xl opacity-20">🧴</div>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <h2 className="text-3xl font-bold text-foreground font-serif leading-tight">
                  {perfume.name}
                </h2>
                <p className="text-sm font-medium text-muted uppercase tracking-wider mt-1">
                  {perfume.brand}
                </p>
                {perfume.concentration && (
                  <span className="masonry-card-badge mt-2">{perfume.concentration}</span>
                )}
              </div>

              {/* Decant / Tester info block */}
              {perfume.is_decant && (
                <div className="decant-drawer-block">
                  <span className="decant-drawer-label">🧪 Decant</span>
                  {perfume.decant_volume_ml != null && (
                    <span className="decant-drawer-meta">{perfume.decant_volume_ml}ml</span>
                  )}
                  {perfume.decant_source && (
                    <span className="decant-drawer-meta">via {perfume.decant_source}</span>
                  )}
                  {perfume.decant_finished && (
                    <span className="decant-finished-pill">Empty</span>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="h-px bg-border" />

              {/* Rating */}
              {perfume.rating != null && (
                <div>
                  <div className="drawer-label">Your Rating</div>
                  <StarRating rating={perfume.rating} />
                </div>
              )}

              {/* Longevity */}
              {perfume.longevity_hours != null && (
                <div>
                  <div className="drawer-label">Longevity</div>
                  <LongevityBar hours={perfume.longevity_hours} />
                </div>
              )}

              {/* Ideal Season */}
              {perfume.ideal_season && (
                <div>
                  <div className="drawer-label">Ideal Season</div>
                  <SeasonIcons activeSeason={perfume.ideal_season} />
                </div>
              )}

              {/* Notes breakdown */}
              {(notes.top.length > 0 || notes.heart.length > 0 || notes.base.length > 0) && (
                <div>
                  <div className="drawer-label">Fragrance Notes</div>
                  <div className="space-y-3">
                    {notes.top.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-accent mb-1.5">Top Notes</div>
                        <div className="flex flex-wrap gap-1.5">
                          {notes.top.map((n, i) => (
                            <span key={i} className="note-tag top">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {notes.heart.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-1.5" style={{ color: '#f472b6' }}>Heart Notes</div>
                        <div className="flex flex-wrap gap-1.5">
                          {notes.heart.map((n, i) => (
                            <span key={i} className="note-tag heart">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {notes.base.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-1.5" style={{ color: '#a78bfa' }}>Base Notes</div>
                        <div className="flex flex-wrap gap-1.5">
                          {notes.base.map((n, i) => (
                            <span key={i} className="note-tag base">{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Occasion */}
              {perfume.occasion && (
                <div>
                  <div className="drawer-label">Best For</div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent">
                    {perfume.occasion}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
