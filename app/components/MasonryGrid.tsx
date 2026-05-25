"use client"

import React, { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BottleImage } from '@/components/ui/BottleImage'
import type { Perfume } from './PerfumeShelf'

type Props = {
  perfumes: Perfume[]
  onSelect: (p: Perfume) => void
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.04,
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.25 },
  },
}

const MasonryGrid = memo(function MasonryGrid({ perfumes, onSelect }: Props) {
  return (
    <div className="masonry-grid">
      <AnimatePresence mode="popLayout">
        {perfumes.map((p, i) => (
          <motion.div
            key={p.id}
            layout
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="masonry-card"
            onClick={() => onSelect(p)}
            data-fragrance-card={true}
          >
            {/* Bottle image */}
            <div className="relative overflow-hidden">
              {p.image_url || p.cloudinary_public_id ? (
                <div className="flex justify-center p-4 bg-surface-hover/50">
                  <BottleImage
                    publicId={p.cloudinary_public_id || p.image_url || ''}
                    alt={p.name || 'Perfume bottle'}
                    width={400}
                    height={400}
                    style={{ minHeight: '180px', maxHeight: '320px', width: '100%', height: 'auto', objectFit: 'contain' }}
                    className="masonry-card-img drop-shadow-xl hover:drop-shadow-2xl transition-all duration-300 !bg-transparent"
                  />
                </div>
              ) : (
                <div
                  className="masonry-card-img flex items-center justify-center"
                  style={{ height: `${200 + (i % 4) * 30}px` }}
                >
                  <div className="text-center px-4">
                    <div className="text-3xl mb-2 opacity-30">🧴</div>
                    <div className="text-xs text-muted font-medium">{p.name}</div>
                  </div>
                </div>
              )}

              {/* Hover gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>

            {/* Card body */}
            <div className="masonry-card-body">
              <div className="masonry-card-name font-serif">{p.name || 'Unknown'}</div>
              <div className="masonry-card-brand">{p.brand || ''}</div>
              {p.concentration && (
                <span className="masonry-card-badge">{p.concentration}</span>
              )}

              {/* Rating stars (small preview) */}
              {p.rating && (
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill={star <= Math.round(p.rating!) ? '#f0b429' : 'none'}
                      stroke={star <= Math.round(p.rating!) ? '#f0b429' : 'var(--border-light)'}
                      strokeWidth="2"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                  <span className="text-xs text-muted ml-1">{p.rating}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
})

export default MasonryGrid
