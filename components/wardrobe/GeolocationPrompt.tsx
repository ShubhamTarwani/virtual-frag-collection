'use client'

/**
 * components/wardrobe/GeolocationPrompt.tsx
 * Gets lat/lon via: browser GPS → IP geo → city picker
 * Persists in localStorage (24h TTL).
 */
import { useState, useEffect } from 'react'

// Top 20 Indian cities as fallback
const INDIAN_CITIES = [
  { name: 'Mumbai', lat: 19.076, lon: 72.877 },
  { name: 'Delhi', lat: 28.679, lon: 77.069 },
  { name: 'Bangalore', lat: 12.972, lon: 77.594 },
  { name: 'Hyderabad', lat: 17.385, lon: 78.487 },
  { name: 'Chennai', lat: 13.083, lon: 80.271 },
  { name: 'Kolkata', lat: 22.573, lon: 88.364 },
  { name: 'Pune', lat: 18.520, lon: 73.856 },
  { name: 'Ahmedabad', lat: 23.023, lon: 72.572 },
  { name: 'Jaipur', lat: 26.913, lon: 75.787 },
  { name: 'Surat', lat: 21.170, lon: 72.831 },
  { name: 'Lucknow', lat: 26.847, lon: 80.947 },
  { name: 'Kanpur', lat: 26.449, lon: 80.331 },
  { name: 'Nagpur', lat: 21.146, lon: 79.089 },
  { name: 'Patna', lat: 25.594, lon: 85.138 },
  { name: 'Indore', lat: 22.719, lon: 75.857 },
  { name: 'Bhopal', lat: 23.259, lon: 77.413 },
  { name: 'Visakhapatnam', lat: 17.686, lon: 83.218 },
  { name: 'Chandigarh', lat: 30.741, lon: 76.779 },
  { name: 'Kochi', lat: 9.932, lon: 76.267 },
  { name: 'Guwahati', lat: 26.144, lon: 91.736 },
]

type GeoResult = { lat: number; lon: number; label?: string }
type Props = {
  onResolved: (result: GeoResult) => void
}

const LS_KEY = 'wardrobe_geo'
const TTL_MS = 24 * 60 * 60 * 1000

function readCached(): GeoResult | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.ts > TTL_MS) return null
    return { lat: parsed.lat, lon: parsed.lon, label: parsed.label }
  } catch {
    return null
  }
}

function writeCache(result: GeoResult) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...result, ts: Date.now() }))
  } catch {
    // storage full — ignore
  }
}

export default function GeolocationPrompt({ onResolved }: Props) {
  const [phase, setPhase] = useState<'checking' | 'prompt' | 'cityPicker' | 'done'>('checking')
  const [error] = useState<string | null>(null)

  useEffect(() => {
    // 1. Check localStorage cache first
    const cached = readCached()
    if (cached) {
      // eslint-disable-next-line
      setPhase('done')
      onResolved(cached)
    } else {
      // eslint-disable-next-line
      setPhase('prompt')
    }
  }, [onResolved])

  const tryBrowserGeo = () => {
    if (!navigator.geolocation) {
      tryIpGeo()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const result: GeoResult = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        writeCache(result)
        onResolved(result)
        setPhase('done')
      },
      () => {
        // Permission denied or unavailable → try IP geo
        tryIpGeo()
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  const tryIpGeo = async () => {
    try {
      const res = await fetch('/api/wardrobe/ip-geo')
      const data = await res.json()
      if (data.lat && data.lon) {
        const result: GeoResult = { lat: data.lat, lon: data.lon, label: data.city }
        writeCache(result)
        onResolved(result)
        setPhase('done')
        return
      }
    } catch {
      // Fall through
    }
    setPhase('cityPicker')
  }

  const selectCity = (city: typeof INDIAN_CITIES[number]) => {
    const result: GeoResult = { lat: city.lat, lon: city.lon, label: city.name }
    writeCache(result)
    onResolved(result)
    setPhase('done')
  }

  const skipGeo = () => {
    onResolved({ lat: 0, lon: 0 })
    setPhase('done')
  }

  if (phase === 'checking' || phase === 'done') return null

  if (phase === 'prompt') {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 mb-6 text-center">
        <p className="text-2xl mb-2">📍</p>
        <p className="font-semibold text-[var(--foreground)] mb-1">Allow location access</p>
        <p className="text-sm text-[var(--muted)] mb-4">
          Used to detect weather for better recommendations. Never stored or shared.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            id="geo-allow-btn"
            onClick={tryBrowserGeo}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
            style={{ background: 'var(--accent)', color: 'var(--background)' }}
          >
            Allow Location
          </button>
          <button
            id="geo-skip-btn"
            onClick={() => setPhase('cityPicker')}
            className="px-5 py-2 rounded-full text-sm font-medium border border-[var(--border-light)] text-[var(--muted)] hover:text-[var(--foreground)] transition-all"
          >
            Pick City Instead
          </button>
        </div>
        {error && <p className="text-xs text-[var(--danger)] mt-2">{error}</p>}
      </div>
    )
  }

  if (phase === 'cityPicker') {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 mb-6">
        <p className="font-semibold text-[var(--foreground)] mb-3">Select your city</p>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {INDIAN_CITIES.map((city) => (
            <button
              key={city.name}
              id={`city-${city.name.toLowerCase()}`}
              onClick={() => selectCity(city)}
              className="px-3 py-1.5 rounded-full text-sm border border-[var(--border-light)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
            >
              {city.name}
            </button>
          ))}
        </div>
        <button
          onClick={skipGeo}
          className="mt-3 text-xs text-[var(--muted)] hover:text-[var(--foreground)] underline transition-colors"
        >
          Skip — use season & time only
        </button>
      </div>
    )
  }

  return null
}
