'use client'

/**
 * components/wardrobe/ContextCard.tsx
 * Magazine-style card showing detected weather + time + season.
 */
import type { AutoContext } from '@/lib/wardrobe/context'

type Props = {
  context: AutoContext | null
  loading?: boolean
  onRefresh?: () => void
}

function weatherIcon(condition: string | null): string {
  switch (condition) {
    case 'sunny': return '☀️'
    case 'rainy': return '🌧️'
    case 'cloudy': return '☁️'
    case 'windy': return '💨'
    default: return '🌡️'
  }
}

function seasonLabel(season: string): string {
  switch (season) {
    case 'summer': return 'Summer'
    case 'monsoon': return 'Monsoon'
    case 'post_monsoon': return 'Post-monsoon'
    case 'winter': return 'Winter'
    default: return season
  }
}

function timeLabel(timeOfDay: string): string {
  switch (timeOfDay) {
    case 'morning': return 'Morning'
    case 'afternoon': return 'Afternoon'
    case 'evening': return 'Evening'
    case 'night': return 'Night'
    default: return timeOfDay
  }
}

export default function ContextCard({ context, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-6 shimmer-bg" style={{ minHeight: 72 }} />
    )
  }

  if (!context) return null

  const icon = weatherIcon(context.condition)
  const tempStr = context.weatherAvailable && context.temp !== null ? `${context.temp}°C` : null
  const condStr = context.weatherAvailable && context.condition ? context.condition : null
  const summary = [
    tempStr,
    condStr && condStr !== 'unknown' ? condStr : null,
    timeLabel(context.timeOfDay).toLowerCase(),
  ].filter(Boolean).join(', ')

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-6 flex items-center gap-4">
      <span className="text-3xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--foreground)] leading-tight">
          {summary || `${timeLabel(context.timeOfDay)} · ${seasonLabel(context.season)}`}
        </p>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {seasonLabel(context.season)} in India
          {!context.weatherAvailable && ' · Weather unavailable, using season & time'}
        </p>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Refresh location"
          className="text-xs text-[var(--muted)] hover:text-[var(--accent)] transition-colors shrink-0"
        >
          ↺ Refresh
        </button>
      )}
    </div>
  )
}
