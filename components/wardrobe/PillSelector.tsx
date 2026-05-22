'use client'

/**
 * components/wardrobe/PillSelector.tsx
 * Horizontal scrollable pill row with Framer Motion layout animation.
 */
import { motion } from 'framer-motion'

export type PillOption = {
  value: string
  label: string
  icon?: string
}

type PillSelectorProps = {
  label: string
  options: PillOption[]
  value: string | undefined
  onChange: (value: string | undefined) => void
  allowDeselect?: boolean
}

export default function PillSelector({ label, options, value, onChange, allowDeselect = true }: PillSelectorProps) {
  const handleClick = (opt: PillOption) => {
    if (allowDeselect && value === opt.value) {
      onChange(undefined)
    } else {
      onChange(opt.value)
    }
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-2">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
        {options.map((opt) => {
          const isSelected = value === opt.value
          return (
            <motion.button
              key={opt.value}
              id={`pill-${label.toLowerCase()}-${opt.value}`}
              onClick={() => handleClick(opt)}
              layout
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 whitespace-nowrap shrink-0"
              style={{
                background: isSelected ? 'var(--accent)' : 'transparent',
                borderColor: isSelected ? 'var(--accent)' : 'var(--border-light)',
                color: isSelected ? 'var(--background)' : 'var(--muted)',
              }}
            >
              {opt.icon && <span>{opt.icon}</span>}
              {opt.label}
              {isSelected && (
                <motion.span
                  layoutId={`pill-check-${label}`}
                  className="ml-0.5"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ color: 'var(--background)' }}
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
